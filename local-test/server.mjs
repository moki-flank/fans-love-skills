#!/usr/bin/env node
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "local-test", "public");
const port = Number(process.env.PORT ?? 5179);

loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, ".env"));

const skillRoutes = {
  "/api/agent/fans-love-chat": "/webhook/agent/fans-love-chat",
  "/api/skill/star-consulting": "/webhook/skill/star-consulting",
  "/api/skill/pet-interaction": "/webhook/skill/pet-interaction",
  "/api/skill/memory-card-generation": "/webhook/skill/memory-card-generation",
  "/api/skill/daily-task-planner": "/webhook/skill/daily-task-planner",
  "/api/skill/record-verify": "/webhook/skill/record-verify"
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

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

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function proxySkill(request, response, webhookPath) {
  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    json(response, 500, { error: "Missing N8N_BASE_URL in .env.local." });
    return;
  }

  const body = await readRequestBody(request);
  const upstream = await fetch(`${baseUrl}${webhookPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await upstream.text();
  response.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(text);
}

async function listWorkflows(response) {
  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.N8N_API_KEY;
  if (!baseUrl || !apiKey) {
    json(response, 500, { error: "Missing N8N_BASE_URL or N8N_API_KEY in .env.local." });
    return;
  }

  const upstream = await fetch(`${baseUrl}/api/v1/workflows?limit=100`, {
    headers: {
      "X-N8N-API-KEY": apiKey
    }
  });
  const text = await upstream.text();
  response.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(text);
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = resolve(publicDir, `.${decodeURIComponent(pathname)}`);

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = extname(filePath);
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] ?? "application/octet-stream",
    "Cache-Control": "no-store"
  });
  response.end(readFileSync(filePath));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/api/workflows") {
      await listWorkflows(response);
      return;
    }
    if (request.method === "POST" && skillRoutes[url.pathname]) {
      await proxySkill(request, response, skillRoutes[url.pathname]);
      return;
    }
    if (request.method === "GET") {
      serveStatic(request, response);
      return;
    }
    json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    json(response, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Fans Love workflow tester: http://localhost:${port}`);
});
