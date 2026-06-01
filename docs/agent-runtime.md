# Agent Runtime

`fan.codex_loop_agent.v1` is the large-model runtime contract for FS Love.

It is the default intelligent agent entrypoint. The primary runtime is n8n, and the local Node runtime remains a fallback/debug runner. See
`docs/agent-closed-loop-plan.md` for the end-to-end plan.

It uses the OpenAI Responses API with function tools:

- `call_skill`: asks the runtime to call one allowed FS Love Skill through n8n.
- `finish_agent_loop`: stops the loop and returns the final reply.

The runtime repeats:

```text
model plans
  -> model calls call_skill when needed
  -> runtime calls n8n webhook
  -> runtime returns observation to model
  -> model continues or calls finish_agent_loop
```

The loop stops when:

- the model returns no tool calls
- the model calls `finish_agent_loop`
- required user input is missing
- `AGENT_MAX_STEPS` is reached

Local variables:

- `AGENT_RUNTIME_MODE=auto`: use OpenAI when `OPENAI_API_KEY` exists, otherwise use mock routing.
- `AGENT_RUNTIME_MODE=openai`: require OpenAI.
- `AGENT_RUNTIME_MODE=mock`: force local heuristic mode.
- `AGENT_MAX_STEPS=20`: safety cap.
- `AGENT_MAX_STEPS=0`: no explicit step cap for trusted local runs.
- `OPENAI_API_KEY`: OpenAI API key.
- `OPENAI_MODEL`: model name, default `gpt-5.5`.
- `OPENAI_REASONING_EFFORT`: optional reasoning effort, for example `medium`.

Default local test endpoint:

```text
POST http://localhost:5179/api/agent/loop
```

This proxies to the n8n AI loop workflow:

```text
POST ${N8N_BASE_URL}/webhook/agent/fans-love-loop
```

Fallback local runtime endpoint:

```text
POST http://localhost:5179/api/agent/local-loop
```

The frontend should eventually call one backend endpoint:

```text
POST /api/agent/loop
```
