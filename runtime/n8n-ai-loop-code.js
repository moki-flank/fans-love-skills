const payload = $json.payload;
const headers = $json.headers ?? {};
const httpRequest = this.helpers.httpRequest.bind(this.helpers);

function readEnv(name) {
  try {
    return process?.env?.[name];
  } catch {
    return undefined;
  }
}

const openaiApiKey =
  payload.openai_api_key ??
  headers["x-openai-api-key"] ??
  headers["X-OpenAI-API-Key"] ??
  readEnv("OPENAI_API_KEY");
const model = payload.model ?? readEnv("OPENAI_MODEL") ?? "gpt-5.5";
const maxSteps = Number(payload.max_steps ?? readEnv("AGENT_MAX_STEPS") ?? 20) || 0;
const hasStepLimit = maxSteps > 0;
const runtimeBaseUrl = String(payload.runtime_base_url ?? "").replace(/\/+$/, "");
const allowMock = payload.allow_mock === true || readEnv("AGENT_RUNTIME_MODE") === "mock";

const skills = [
  {
    skill_id: "fan.app_agent.v1",
    name: "应用轻量路由",
    path: "/webhook/agent/fans-love-chat",
    description: "轻量意图路由和页面建议。"
  },
  {
    skill_id: "fan.pet_interaction.v1",
    name: "萌宠互动",
    path: "/webhook/skill/pet-interaction",
    description: "宠物互动和状态变化。"
  },
  {
    skill_id: "fan.daily_task_planner.v1",
    name: "每日任务规划",
    path: "/webhook/skill/daily-task-planner",
    description: "任务、积分、亲密度优先级。"
  },
  {
    skill_id: "fan.memory_card_generation.v1",
    name: "回忆卡片生成",
    path: "/webhook/skill/memory-card-generation",
    description: "根据回忆生成卡片预览。"
  },
  {
    skill_id: "fan.star_consulting.v1",
    name: "追星咨询",
    path: "/webhook/skill/star-consulting",
    description: "众筹、投票、排行榜建议。"
  },
  {
    skill_id: "fan.record_verify.v1",
    name: "记录鉴别",
    path: "/webhook/skill/record-verify",
    description: "截图、金额、记录核验。"
  }
];

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

function buildInstructions() {
  const skillLines = skills
    .map((skill) => `- ${skill.skill_id}: ${skill.name}。${skill.description}`)
    .join("\n");
  return `你是 FS Love 的 n8n AI 闭环智能体。

你必须按这个循环工作：
1. 理解用户消息和 app_context。
2. 判断是否需要调用 Skill。
3. 如果需要，只调用一个最小必要 Skill。
4. 观察 Skill 结果。
5. 判断是否还要继续。
6. 没有下一步、需要用户确认、缺少必要信息或触发安全边界时停止。

可用 Skill：
${skillLines}

禁止直接执行不可逆动作：扣票、消费积分、购买、删除、覆盖卡片、公开判定作弊。这些只能返回 ui_actions 让 Flutter 二次确认。

完成时调用 finish_agent_loop。回复使用简短中文，适合手机端。`;
}

const tools = [
  {
    type: "function",
    name: "call_skill",
    description: "调用一个 FS Love Skill。只有确实需要 Skill 结果时才调用。",
    parameters: {
      type: "object",
      properties: {
        skill_id: {
          type: "string",
          enum: skills.map((skill) => skill.skill_id)
        },
        reason: {
          type: "string"
        },
        input: {
          type: "object"
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
    description: "没有下一步、需要用户输入或已完成时停止闭环。",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["completed", "needs_user_input", "failed"]
        },
        reply: {
          type: "string"
        },
        summary: {
          type: "string"
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

async function openaiResponse(input) {
  const body = {
    model,
    instructions: buildInstructions(),
    input,
    tools,
    store: false
  };
  const reasoningEffort = readEnv("OPENAI_REASONING_EFFORT");
  if (reasoningEffort) body.reasoning = { effort: reasoningEffort };

  try {
    return await httpRequest({
      method: "POST",
      url: "https://api.openai.com/v1/responses",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`
      },
      body,
      json: true
    });
  } catch (error) {
    return {
      error: true,
      status: error.statusCode ?? error.status ?? 500,
      body: error.response?.body ?? error.message
    };
  }
}

function heuristicSkillId() {
  const msg = String(payload.message ?? "").toLowerCase();
  const route = String(payload.app_context?.route ?? "");
  const has = (...words) => words.some((word) => msg.includes(word));
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
  return "fan.pet_interaction.v1";
}

function deriveSkillInput(skillId) {
  const context = payload.app_context ?? {};
  const user = context.current_user ?? {};
  const base = {
    user_id: payload.user_id ?? user.id ?? "local-user",
    card_id: payload.card_id ?? "pet_support_cat_v1"
  };
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
        source: "n8n_ai_loop",
        message: payload.message
      }
    };
  }
  if (skillId === "fan.app_agent.v1") return payload;
  return {
    ...base,
    pet_id: context.pet?.pet_id ?? "emo",
    action: "check_in",
    context: {
      message: payload.message
    }
  };
}

async function callSkill(skillId, input) {
  const skill = skills.find((item) => item.skill_id === skillId);
  if (!skill) return { ok: false, error: `Skill not allowed: ${skillId}` };
  const url = `${runtimeBaseUrl}${skill.path}`;
  try {
    const output = await httpRequest({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json"
      },
      body: input ?? {},
      json: true
    });
    return {
      ok: true,
      status: 200,
      skill_id: skillId,
      output
    };
  } catch (error) {
    return {
      ok: false,
      status: error.statusCode ?? error.status ?? 500,
      skill_id: skillId,
      output: error.response?.body ?? error.message
    };
  }
}

if (!runtimeBaseUrl) {
  return [
    {
      json: {
        status: "failed",
        reply: "n8n runtime_base_url 缺失，无法调用 Skill webhook。",
        steps: [],
        used_skill_ids: []
      }
    }
  ];
}

if (!openaiApiKey && !allowMock) {
  return [
    {
      json: {
        status: "needs_configuration",
        reply:
          "n8n 还没有配置 OPENAI_API_KEY，所以 AI 闭环工作流已就绪但不能真正调用大模型。请在 n8n 运行环境中设置 OPENAI_API_KEY 后重启 n8n。",
        model,
        steps: [],
        used_skill_ids: [],
        ui_actions: [
          {
            type: "show_toast",
            label: "请配置 n8n 的 OPENAI_API_KEY"
          }
        ],
        required_env: ["OPENAI_API_KEY"]
      }
    }
  ];
}

if (!openaiApiKey && allowMock) {
  const skillId = heuristicSkillId();
  const input = deriveSkillInput(skillId);
  const result = await callSkill(skillId, input);
  return [
    {
      json: {
        status: result.ok ? "completed" : "failed",
        reply: result.ok
          ? `Mock 闭环已调用 ${skillId}，没有更多必须执行的下一步。`
          : `Mock 闭环调用 ${skillId} 失败。`,
        model: "n8n-mock-loop",
        steps: [
          {
            index: 1,
            type: "call_skill",
            skill_id: skillId,
            reason: "allow_mock=true 时使用 n8n 启发式兜底。",
            input,
            output: result
          }
        ],
        used_skill_ids: [skillId],
        ui_actions: result.output?.ui_actions ?? result.output?.next_actions ?? []
      }
    }
  ];
}

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
            max_steps: maxSteps
          },
          null,
          2
        )
      }
    ]
  }
];
const steps = [];
const usedSkillIds = new Set();

for (let iteration = 1; ; iteration++) {
  if (hasStepLimit && iteration > maxSteps) {
    return [
      {
        json: {
          status: "max_steps_reached",
          reply: `已执行 ${maxSteps} 轮，达到安全上限。`,
          model,
          steps,
          used_skill_ids: [...usedSkillIds],
          ui_actions: []
        }
      }
    ];
  }

  const response = await openaiResponse(input);
  if (response.error) {
    return [
      {
        json: {
          status: "failed",
          reply: "OpenAI 调用失败。",
          model,
          steps,
          openai_error: response
        }
      }
    ];
  }

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
    return [
      {
        json: {
          status: "completed",
          reply: outputText || "已完成，没有更多需要执行的动作。",
          model,
          steps,
          used_skill_ids: [...usedSkillIds],
          ui_actions: []
        }
      }
    ];
  }

  input = [...input, ...(response.output ?? [])];
  const functionOutputs = [];

  for (const call of calls) {
    const args = safeJsonParse(call.arguments, {});
    if (call.name === "finish_agent_loop") {
      return [
        {
          json: {
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
          }
        }
      ];
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
    usedSkillIds.add(skillId);
    const result = await callSkill(skillId, args.input ?? {});
    steps.push({
      index: steps.length + 1,
      type: "call_skill",
      skill_id: skillId,
      reason: args.reason,
      input: args.input ?? {},
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
