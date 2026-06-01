# FS Love 智能体闭环方案

## 默认入口

所有客户端默认调用：

```text
POST /api/agent/loop
```

默认智能体：

```text
fans_love_loop_agent.v1
```

默认入口 Skill：

```text
fan.codex_loop_agent.v1
```

`fan.app_agent.v1` 只作为轻量路由 Skill，不再作为默认入口。

## 闭环链路

```text
Flutter App
  -> POST /api/agent/loop
  -> Agent Runtime
  -> OpenAI Responses 模型
  -> 判断是否需要 Skill
  -> call_skill
  -> n8n webhook 执行 Skill
  -> Skill JSON 结果
  -> Agent Runtime 回填观察结果给模型
  -> 模型继续判断
  -> 无下一步 / 需要用户确认 / 达到边界
  -> finish_agent_loop
  -> Flutter 渲染 reply + ui_actions
```

## 输入契约

Flutter 每次调用都传：

- `user_id`
- `conversation_id`
- `card_id`
- `message`
- `app_context`

`app_context` 来自 `AppState`：

- `current_user`
- `current_star`
- `pet`
- `projects`
- `stars`
- `tasks`
- `memory_records`
- `cards`
- `route`
- `current_tab_index`

## 运行策略

1. Agent Runtime 加载 GitHub Registry。
2. 读取 `default_agent_id`，默认选择 `fans_love_loop_agent.v1`。
3. 读取 `entry_skill_id`，进入 `fan.codex_loop_agent.v1`。
4. Runtime 将可用 Skill 暴露成模型工具：
   - `call_skill`
   - `finish_agent_loop`
5. 模型每轮只能选择一个最小必要 Skill。
6. Runtime 执行 Skill 并把结果回填给模型。
7. 模型判断是否继续。
8. 没有必要动作时停止。

## Skill 选择规则

- 宠物互动、安慰、喂食、陪伴：`fan.pet_interaction.v1`
- 今日任务、积分、奖励、亲密度：`fan.daily_task_planner.v1`
- 回忆、照片、卡片生成：`fan.memory_card_generation.v1`
- 众筹、投票、排行榜、项目进度：`fan.star_consulting.v1`
- 截图、金额、记录核验：`fan.record_verify.v1`
- 轻量页面路由和兜底判断：`fan.app_agent.v1`

## 停止条件

Agent 必须在以下任一情况停止：

- 模型确认没有下一步需要执行。
- 模型调用 `finish_agent_loop`。
- 缺少必要用户输入。
- 需要用户确认不可逆操作。
- 触发安全边界。
- 达到 `AGENT_MAX_STEPS`。

`AGENT_MAX_STEPS=0` 表示不设置显式步数上限，只适合可信本地调试。

## 安全边界

以下操作不能由模型直接执行：

- 扣票
- 消费积分
- 购买项目
- 删除记录
- 覆盖已有卡片
- 公开判定用户作弊

这些动作只能返回 `ui_actions`，由 Flutter 让用户确认后再执行。

## 阶段计划

### Phase 1: 本地闭环

状态：已完成。

- 建立 Skill Registry。
- 建立 6 个 n8n workflow。
- 建立 `/api/agent/loop` 本地 runtime。
- 建立本地测试台。
- 无 OpenAI key 时 mock fallback 可跑通。

### Phase 2: 大模型接入

状态：待配置 key。

- 在 `.env.local` 写入 `OPENAI_API_KEY`。
- 设置 `OPENAI_MODEL=gpt-5.5`。
- 用测试台验证模型是否会调用 Skill。
- 调整 prompt，让模型少调用无意义 Skill。

### Phase 3: Flutter 接入

状态：待改 `Fans-love` App。

- `PetAIPage` 调用 `/api/agent/loop`。
- 从 `AppState` 组装 `app_context`。
- 渲染 `reply`。
- 渲染 `ui_actions`。
- 对确认型动作弹出二次确认。

### Phase 4: 数据库闭环

状态：schema 已准备。

- 写入 `fan_agent_loop_runs`。
- 写入 `fan_agent_loop_steps`。
- 将卡片生成、任务建议、宠物状态同步到远程数据库。
- n8n workflow 读取数据库而不是只读请求 JSON。

### Phase 5: 线上部署

状态：待部署。

- 将 `runtime/agent-loop.mjs` 部署为后端 API。
- Flutter 只调用后端统一入口。
- n8n 只保留 Skill 执行器角色。
- GitHub Pages 只作为 Skill Registry 和配置中心。

## 验收标准

- Registry 明确 `default_agent_id=fans_love_loop_agent.v1`。
- Flutter 默认调用 `/api/agent/loop`。
- Agent 至少能自动选择 1 个 Skill。
- Skill 输出能回填给模型。
- 模型能在无下一步时停止。
- 不可逆动作只返回确认动作。
- n8n key、OpenAI key、数据库连接不进入 Git。
