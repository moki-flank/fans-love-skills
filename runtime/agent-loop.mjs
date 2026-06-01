import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const DEFAULT_ALLOWED_SKILLS = [
  "fan.app_agent.v1",
  "fan.pet_interaction.v1",
  "fan.daily_task_planner.v1",
  "fan.memory_card_generation.v1",
  "fan.star_consulting.v1",
  "fan.record_verify.v1"
];

export function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const raw = readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export function loadLocalEnv(root = repoRoot) {
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(root, ".env"));
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function loadSkillCatalog(root, allowedSkillIds) {
  return allowedSkillIds.map((skillId) => {
    const manifestPath = join(root, "skills", skillId, "skill.json");
    const manifest = readJson(manifestPath);
    return {
      skill_id: manifest.skill_id,
      name: manifest.name,
      description: manifest.description,
      type: manifest.type,
      permissions: manifest.permissions ?? [],
      risk_level: manifest.risk_level,
      execution: manifest.execution
    };
  });
}

function webhookPathForSkill(skill) {
  const template = skill.execution?.endpoint_template;
  if (!template) return null;
  return template.replace("${N8N_BASE_URL}", "");
}

function normalizeAllowedSkillIds(payload) {
  const requested = Array.isArray(payload.allowed_skill_ids)
    ? payload.allowed_skill_ids
    : DEFAULT_ALLOWED_SKILLS;
  return requested.filter(
    (skillId) =>
      DEFAULT_ALLOWED_SKILLS.includes(skillId) &&
      skillId !== "fan.codex_loop_agent.v1"
  );
}

function safeJsonParse(value, fallback = {}) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function extractOutputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  const parts = [];
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" || content.type === "text") {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

function functionCalls(response) {
  return (response.output ?? []).filter((item) => item.type === "function_call");
}

function buildInstructions(skillCatalog) {
  const skillList = skillCatalog
    .map(
      (skill) =>
        `- ${skill.skill_id}: ${skill.name}. ${skill.description} Risk=${skill.risk_level}.`
    )
    .join("\n");

  return `You are the FS Love Codex-style loop agent.

Run a plan-execute-observe loop:
1. Understand the user's request and current app context.
2. Decide whether one FS Love skill is necessary.
3. If necessary, call call_skill with the smallest useful skill input.
4. Observe the result and decide again.
5. Stop when there is no necessary next action, when user confirmation is required, or when required data is missing.

Do not call tools just to be busy. Do not perform irreversible actions such as spending votes, buying points, deleting records, or overwriting cards; return confirmation actions instead.

Available skills:
${skillList}

When finished, call finish_agent_loop with a concise mobile-friendly Chinese reply and a short summary of skills used.`;
}

function buildOpenAITools(skillCatalog) {
  return [
    {
      type: "function",
      name: "call_skill",
      description:
        "Call exactly one FS Love skill through the local runtime. Use only when the skill result is needed to answer or continue.",
      parameters: {
        type: "object",
        properties: {
          skill_id: {
            type: "string",
            enum: skillCatalog.map((skill) => skill.skill_id)
          },
          reason: {
            type: "string",
            description: "Brief user-visible reason for this skill call."
          },
          input: {
            type: "object",
            description: "JSON payload matching the selected skill input schema."
          }
        },
        required: ["skill_id", "reason", "input"],
        additionalProperties: false
      },
      strict: false
    },
    {
      type: "function",
      name: "finish_agent_loop",
      description:
        "Finish the loop when no more skill calls are needed, user input is required, or the request is fully handled.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["completed", "needs_user_input", "failed"]
          },
          reply: {
            type: "string",
            description: "Final Chinese reply for the FS Love user."
          },
          summary: {
            type: "string",
            description: "Short execution summary."
          },
          ui_actions: {
            type: "array",
            items: {
              type: "object"
            }
          }
        },
        required: ["status", "reply", "summary"],
        additionalProperties: false
      },
      strict: false
    }
  ];
}

async function createOpenAIResponse({ model, instructions, input, tools }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const body = {
    model,
    instructions,
    input,
    tools,
    store: false
  };

  if (process.env.OPENAI_REASONING_EFFORT) {
    body.reasoning = { effort: process.env.OPENAI_REASONING_EFFORT };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const parsed = text ? safeJsonParse(text, { raw: text }) : {};
  if (!response.ok) {
    const message = parsed.error?.message ?? parsed.message ?? text;
    throw new Error(`OpenAI Responses API error: ${response.status} ${message}`);
  }
  return parsed;
}

async function callSkill(skillCatalog, skillId, input, { dryRun = false } = {}) {
  const skill = skillCatalog.find((item) => item.skill_id === skillId);
  if (!skill) {
    return {
      ok: false,
      error: `Skill is not allowed: ${skillId}`
    };
  }

  const path = webhookPathForSkill(skill);
  if (!path) {
    return {
      ok: false,
      error: `Skill has no n8n webhook execution path: ${skillId}`
    };
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      skill_id: skillId,
      endpoint_path: path,
      input
    };
  }

  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    return {
      ok: false,
      error: "Missing N8N_BASE_URL."
    };
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input ?? {})
  });
  const text = await response.text();
  const output = text ? safeJsonParse(text, { raw: text }) : {};
  return {
    ok: response.ok,
    status: response.status,
    skill_id: skillId,
    output
  };
}

function appContext(payload) {
  return payload.app_context ?? {};
}

function deriveSkillInput(skillId, payload) {
  const context = appContext(payload);
  const user = context.current_user ?? {};
  const base = {
    user_id: payload.user_id ?? user.id ?? "local-user",
    card_id: payload.card_id ?? "pet_support_cat_v1"
  };

  if (skillId === "fan.app_agent.v1") {
    return payload;
  }
  if (skillId === "fan.daily_task_planner.v1") {
    return {
      ...base,
      points: user.points,
      pet_intimacy: context.pet?.intimacy,
      current_star: context.current_star,
      tasks: context.tasks ?? []
    };
  }
  if (skillId === "fan.memory_card_generation.v1") {
    const record = (context.memory_records ?? [])[0] ?? {};
    return {
      ...base,
      style: "warm_album",
      record: {
        id: record.id ?? "record_local",
        content: record.content ?? payload.message,
        location: record.location,
        created_at: record.created_at ?? record.createdAt,
        image_urls: record.image_urls ?? record.imageUrls ?? []
      }
    };
  }
  if (skillId === "fan.star_consulting.v1") {
    return {
      ...base,
      star_id: context.current_star?.id ?? user.current_star_id,
      available_votes: user.my_star_votes_today ?? 0,
      projects: context.projects ?? [],
      rankings: context.stars ?? []
    };
  }
  if (skillId === "fan.record_verify.v1") {
    return {
      ...base,
      metadata: {
        source: "agent_loop",
        message: payload.message
      }
    };
  }
  return {
    ...base,
    pet_id: context.pet?.pet_id ?? "emo",
    action: "check_in",
    context: {
      message: payload.message
    }
  };
}

function heuristicSkillId(payload) {
  const message = String(payload.message ?? "").toLowerCase();
  const route = String(payload.app_context?.route ?? "");
  const has = (...words) => words.some((word) => message.includes(word));
  if (has("卡片", "回忆", "照片", "生成") || route.includes("memories")) {
    return "fan.memory_card_generation.v1";
  }
  if (has("任务", "积分", "奖励", "亲密") || route.includes("/pet/task")) {
    return "fan.daily_task_planner.v1";
  }
  if (has("众筹", "投票", "排行", "榜", "应援") || route.includes("/crowdfunding")) {
    return "fan.star_consulting.v1";
  }
  if (has("审核", "核验", "截图", "金额")) {
    return "fan.record_verify.v1";
  }
  if (has("路由", "入口", "判断")) {
    return "fan.app_agent.v1";
  }
  return "fan.pet_interaction.v1";
}

async function runMockLoop(payload, skillCatalog, options) {
  const selectedSkillId = heuristicSkillId(payload);
  const input = deriveSkillInput(selectedSkillId, payload);
  const result = await callSkill(skillCatalog, selectedSkillId, input, options);
  return {
    status: result.ok ? "completed" : "failed",
    reply: result.ok
      ? `已根据当前上下文调用 ${selectedSkillId}，没有更多必须执行的下一步。`
      : `调用 ${selectedSkillId} 时遇到问题：${result.error ?? result.status}`,
    model: "mock-agent-loop",
    steps: [
      {
        index: 1,
        type: "call_skill",
        skill_id: selectedSkillId,
        reason: "本地无 OpenAI key 时使用启发式循环兜底。",
        input,
        output: result
      }
    ],
    used_skill_ids: [selectedSkillId],
    ui_actions: result.output?.ui_actions ?? result.output?.next_actions ?? []
  };
}

export async function runAgentLoop(payload, options = {}) {
  const root = options.root ?? repoRoot;
  const allowedSkillIds = normalizeAllowedSkillIds(payload);
  const skillCatalog = loadSkillCatalog(root, allowedSkillIds);
  const maxSteps =
    Number(payload.max_steps ?? process.env.AGENT_MAX_STEPS ?? 20) || 0;
  const hasStepLimit = maxSteps > 0;
  const dryRun = Boolean(payload.dry_run ?? options.dryRun);
  const mode = process.env.AGENT_RUNTIME_MODE ?? "auto";

  if (mode === "mock" || (mode === "auto" && !process.env.OPENAI_API_KEY)) {
    return runMockLoop(payload, skillCatalog, { dryRun });
  }
  if (!process.env.OPENAI_API_KEY) {
    return {
      status: "failed",
      reply: "缺少 OPENAI_API_KEY，无法启动大模型循环。",
      model: process.env.OPENAI_MODEL,
      steps: [],
      used_skill_ids: [],
      ui_actions: []
    };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const instructions = buildInstructions(skillCatalog);
  const tools = buildOpenAITools(skillCatalog);
  const usedSkillIds = new Set();
  const steps = [];
  let input = [
    {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: JSON.stringify(
            {
              user_request: payload.message,
              user_id: payload.user_id,
              conversation_id: payload.conversation_id,
              card_id: payload.card_id,
              app_context: payload.app_context ?? {},
              max_steps: maxSteps,
              dry_run: dryRun
            },
            null,
            2
          )
        }
      ]
    }
  ];

  let iteration = 0;
  while (true) {
    iteration += 1;
    if (hasStepLimit && iteration > maxSteps) {
      return {
        status: "max_steps_reached",
        reply: `已执行 ${maxSteps} 轮，达到安全上限。可以提高 AGENT_MAX_STEPS 后继续。`,
        model,
        steps,
        used_skill_ids: [...usedSkillIds],
        ui_actions: []
      };
    }

    const response = await createOpenAIResponse({
      model,
      instructions,
      input,
      tools
    });
    const calls = functionCalls(response);
    const outputText = extractOutputText(response);

    steps.push({
      index: steps.length + 1,
      type: "model_response",
      response_id: response.id,
      output_text: outputText,
      function_calls: calls.map((call) => ({
        name: call.name,
        call_id: call.call_id
      }))
    });

    if (calls.length === 0) {
      return {
        status: "completed",
        reply: outputText || "已完成，没有更多需要执行的动作。",
        model,
        steps,
        used_skill_ids: [...usedSkillIds],
        ui_actions: []
      };
    }

    input = [...input, ...(response.output ?? [])];
    const functionOutputs = [];

    for (const call of calls) {
      const args = safeJsonParse(call.arguments, {});
      if (call.name === "finish_agent_loop") {
        return {
          status: args.status ?? "completed",
          reply: args.reply ?? outputText ?? "已完成。",
          model,
          steps: [
            ...steps,
            {
              index: steps.length + 1,
              type: "finish",
              summary: args.summary,
              ui_actions: args.ui_actions ?? []
            }
          ],
          used_skill_ids: [...usedSkillIds],
          ui_actions: args.ui_actions ?? []
        };
      }

      if (call.name !== "call_skill") {
        functionOutputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({
            ok: false,
            error: `Unknown tool: ${call.name}`
          })
        });
        continue;
      }

      const skillId = args.skill_id;
      const skillInput = args.input ?? {};
      usedSkillIds.add(skillId);
      const result = await callSkill(skillCatalog, skillId, skillInput, { dryRun });

      steps.push({
        index: steps.length + 1,
        type: "call_skill",
        skill_id: skillId,
        reason: args.reason,
        input: skillInput,
        output: result
      });

      functionOutputs.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result)
      });
    }

    input = [...input, ...functionOutputs];
  }
}
