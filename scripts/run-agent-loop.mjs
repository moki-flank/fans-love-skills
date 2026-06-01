#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { runAgentLoop, loadLocalEnv, repoRoot } from "../runtime/agent-loop.mjs";

loadLocalEnv(repoRoot);

function readInput() {
  const file = process.argv[2];
  if (file) return JSON.parse(readFileSync(file, "utf8"));
  const stdin = readFileSync(0, "utf8").trim();
  return stdin ? JSON.parse(stdin) : {};
}

try {
  const payload = readInput();
  const result = await runAgentLoop(payload, { root: repoRoot });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
