# n8n Runtime

The committed workflow files are templates. Credentials, API keys, database URLs, and imported runtime state must stay outside Git.

Required local variables:

- `N8N_BASE_URL`: Your n8n origin, for example `https://n8n.example.com`.
- `N8N_API_KEY`: Local n8n API key.
- `DATABASE_URL`: Remote database URL for the runtime or worker layer.

The sync script uses the n8n public API and sends the API key through the `X-N8N-API-KEY` header.

Workflow deletion is guarded by `N8N_CONFIRM_WIPE=DELETE_ALL_N8N_WORKFLOWS` because it removes every workflow returned by the n8n API.
