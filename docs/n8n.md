# n8n Runtime

The committed workflow files are templates. Credentials, API keys, database URLs, and imported runtime state must stay outside Git.

Required local variables:

- `N8N_BASE_URL`: Your n8n origin, for example `https://n8n.example.com`.
- `N8N_API_KEY`: Local n8n API key.
- `DATABASE_URL`: Remote database URL for the runtime or worker layer.

The sync script uses the n8n public API and sends the API key through the `X-N8N-API-KEY` header.

Workflow deletion is guarded by `N8N_CONFIRM_WIPE=DELETE_ALL_N8N_WORKFLOWS` because it removes every workflow returned by the n8n API.

Current production webhook paths:

- `POST /webhook/agent/fans-love-loop`
- `POST /webhook/agent/fans-love-chat`
- `POST /webhook/skill/star-consulting`
- `POST /webhook/skill/pet-interaction`
- `POST /webhook/skill/memory-card-generation`
- `POST /webhook/skill/daily-task-planner`
- `POST /webhook/skill/record-verify`

The default Codex-style large-model loop now runs in n8n first:

- `POST /api/agent/loop`

The local endpoint proxies to:

- `POST ${N8N_BASE_URL}/webhook/agent/fans-love-loop`

The n8n workflow calls OpenAI directly and then calls the Skill webhooks above as tools.

Required n8n runtime environment:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional, default `gpt-5.5`
- `OPENAI_REASONING_EFFORT` optional
- `AGENT_MAX_STEPS` optional, default `20`
