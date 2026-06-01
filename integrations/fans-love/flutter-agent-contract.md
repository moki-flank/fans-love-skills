# FS Love Flutter Agent Contract

This contract is derived from `/Users/mokiwang/Desktop/Fans-love`.

Observed app modules:

- `PetAIPage`: currently an empty AI interaction page, best mapped to `fan.codex_loop_agent.v1` for large-model loops or `fan.app_agent.v1` for deterministic lightweight routing.
- `PetTaskPage`: currently an empty task page, best mapped to `fan.daily_task_planner.v1`.
- `MemoryCardCreatePage`: currently uses local mock generation, best mapped to `fan.memory_card_generation.v1`.
- `CrowdfundingDetailPage`: supports voting and project progress, mapped to `fan.star_consulting.v1`.
- `StarRankingPage`: local ranking view, mapped to `fan.star_consulting.v1`.
- `AppState`: Provider state source for `currentUser`, `currentStar`, `projects`, `stars`, `tasks`, `memoryRecords`, `cards`, and `petIntimacy`.

Flutter should call one stable endpoint for the large-model loop:

```text
POST /api/agent/loop
```

Default request target:

```json
{
  "agent_id": "fans_love_loop_agent.v1",
  "entry_skill_id": "fan.codex_loop_agent.v1"
}
```

Minimum request:

```json
{
  "user_id": "user_001",
  "card_id": "pet_support_cat_v1",
  "message": "帮我看看今天该先做什么",
  "app_context": {
    "route": "/pet/ai",
    "current_tab_index": 0,
    "current_user": {
      "id": "user_001",
      "nickname": "Archer Fan",
      "points": 2568,
      "current_star_id": "star_001",
      "my_star_votes_today": 12,
      "my_star_votes_total": 20,
      "companion_days": 197
    },
    "pet": {
      "pet_id": "emo",
      "intimacy": 75
    }
  }
}
```

The agent may return `ui_actions` that Flutter can render as buttons or execute after user confirmation. Route names should reuse `AppConstants` values from `lib/core/constants/app_constants.dart`.

Use `fan.app_agent.v1` only for deterministic lightweight routing. Use `fan.codex_loop_agent.v1` when the app wants the model to plan, call multiple Skills if useful, observe results, and stop only when no next action is needed.

Default Flutter behavior:

1. `PetAIPage` sends user message and `AppState` snapshot to `/api/agent/loop`.
2. Backend loads `fans_love_loop_agent.v1`.
3. Runtime exposes allowed Skills as tools.
4. Model calls only the Skills it needs.
5. Runtime returns final `reply`, `steps`, `used_skill_ids`, and `ui_actions`.
