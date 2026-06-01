# Fans Love Skills

This repository is the public Skill registry for the Fans Love agent runtime.

GitHub stores static definitions:

- Skill manifests
- Input and output schemas
- Prompt templates
- Persona cards
- n8n workflow templates

n8n, an API server, or a worker executes the real side effects. The agent runtime reads this registry, chooses a skill, validates input, calls the configured execution backend, and formats the result in the selected card style.

The current registry is aligned with the local Flutter app at `/Users/mokiwang/Desktop/Fans-love`:

- `fan.app_agent.v1`: unified `/pet/ai` chat router
- `fan.codex_loop_agent.v1`: OpenAI-backed plan/execute/observe loop that calls Skills until no next action is needed
- `fan.memory_card_generation.v1`: replacement contract for the current mock memory card generation flow
- `fan.daily_task_planner.v1`: task planner for the currently empty pet task page
- `fan.star_consulting.v1`: crowdfunding and ranking advice
- `fan.pet_interaction.v1`: pet interaction state updates
- `fan.record_verify.v1`: record and screenshot verification

## Layout

```text
skills/     Skill manifests, schemas, and prompt templates
cards/      Persona cards and allowed skill lists
n8n/        Importable n8n workflow templates, excluding local secrets
scripts/    Local sync tools
database/   Runtime database schema draft
agents/     Agent manifests and system prompts
integrations/ App-specific schemas and contracts
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

Run the Codex-style agent loop from the terminal:

```bash
npm run agent:loop -- payload.json
```
