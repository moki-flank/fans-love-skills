#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, ".env"));

const command = process.argv[2] ?? "help";

function loadEnvFile(file) {
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

function requireN8nConfig() {
  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.N8N_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("Missing N8N_BASE_URL or N8N_API_KEY. Put them in .env.local.");
  }
  return { baseUrl, apiKey };
}

async function request(path, options = {}) {
  const { baseUrl, apiKey } = requireN8nConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": apiKey,
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.message ?? body?.error ?? text ?? response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  return body;
}

async function listWorkflows() {
  const workflows = [];
  let cursor;
  do {
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("cursor", cursor);
    const body = await request(`/api/v1/workflows?${query.toString()}`);
    workflows.push(...(body.data ?? []));
    cursor = body.nextCursor;
  } while (cursor);
  return workflows;
}

function workflowPayload(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes ?? [],
    connections: workflow.connections ?? {},
    settings: workflow.settings ?? {}
  };
}

function readWorkflowTemplates() {
  const workflowDir = resolve(root, process.env.N8N_WORKFLOW_DIR ?? "n8n/workflows");
  return readdirSync(workflowDir)
    .filter((file) => file.endsWith(".workflow.json"))
    .sort()
    .map((file) => {
      const fullPath = join(workflowDir, file);
      const workflow = JSON.parse(readFileSync(fullPath, "utf8"));
      return { file, workflow };
    });
}

async function check() {
  const workflows = await listWorkflows();
  console.log(`Connected to n8n. Found ${workflows.length} workflow(s).`);
}

async function push() {
  const existing = await listWorkflows();
  const byName = new Map(existing.map((workflow) => [workflow.name, workflow]));
  const templates = readWorkflowTemplates();

  for (const { file, workflow } of templates) {
    const payload = workflowPayload(workflow);
    const current = byName.get(workflow.name);
    if (current) {
      await request(`/api/v1/workflows/${current.id}`, {
        method: "PUT",
        body: payload
      });
      console.log(`Updated ${workflow.name} from ${file}.`);
    } else {
      await request("/api/v1/workflows", {
        method: "POST",
        body: payload
      });
      console.log(`Created ${workflow.name} from ${file}.`);
    }
  }
}

async function activate() {
  const existing = await listWorkflows();
  const byName = new Map(existing.map((workflow) => [workflow.name, workflow]));
  const templates = readWorkflowTemplates();

  for (const { workflow } of templates) {
    const current = byName.get(workflow.name);
    if (!current) {
      console.log(`Skipped ${workflow.name}; it has not been pushed yet.`);
      continue;
    }
    await request(`/api/v1/workflows/${current.id}/activate`, { method: "POST" });
    console.log(`Activated ${workflow.name} (${current.id}).`);
  }
}

async function wipe() {
  if (process.env.N8N_CONFIRM_WIPE !== "DELETE_ALL_N8N_WORKFLOWS") {
    throw new Error("Refusing to wipe n8n. Set N8N_CONFIRM_WIPE=DELETE_ALL_N8N_WORKFLOWS.");
  }

  const workflows = await listWorkflows();
  for (const workflow of workflows) {
    await request(`/api/v1/workflows/${workflow.id}`, { method: "DELETE" });
    console.log(`Deleted ${workflow.name} (${workflow.id}).`);
  }
  console.log(`Deleted ${workflows.length} workflow(s).`);
}

function help() {
  console.log(`Usage:
  node scripts/sync-n8n.mjs check
  node scripts/sync-n8n.mjs push
  node scripts/sync-n8n.mjs activate
  N8N_CONFIRM_WIPE=DELETE_ALL_N8N_WORKFLOWS node scripts/sync-n8n.mjs wipe`);
}

try {
  if (command === "check") await check();
  else if (command === "push") await push();
  else if (command === "activate") await activate();
  else if (command === "wipe") await wipe();
  else help();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
