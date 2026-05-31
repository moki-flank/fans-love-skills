# Fans Love Skills

This repository is the public Skill registry for the Fans Love agent runtime.

GitHub stores static definitions:

- Skill manifests
- Input and output schemas
- Prompt templates
- Persona cards
- n8n workflow templates

n8n, an API server, or a worker executes the real side effects. The agent runtime reads this registry, chooses a skill, validates input, calls the configured execution backend, and formats the result in the selected card style.

## Layout

```text
skills/     Skill manifests, schemas, and prompt templates
cards/      Persona cards and allowed skill lists
n8n/        Importable n8n workflow templates, excluding local secrets
scripts/    Local sync tools
database/   Runtime database schema draft
```

## Local Setup

Create a local `.env.local` from `.env.example` and put secrets there. `.env.local` is ignored by Git.

```bash
cp .env.example .env.local
```

Check n8n connectivity:

```bash
node scripts/sync-n8n.mjs check
```

Upload workflow templates to n8n:

```bash
node scripts/sync-n8n.mjs push
node scripts/sync-n8n.mjs activate
```

Delete all workflows is intentionally guarded:

```bash
N8N_CONFIRM_WIPE=DELETE_ALL_N8N_WORKFLOWS node scripts/sync-n8n.mjs wipe
```

Start the local workflow tester:

```bash
npm run test:web
```
