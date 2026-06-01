create table if not exists skill_registry_events (
  id bigserial primary key,
  skill_id text not null,
  card_id text,
  user_id text,
  event_type text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists fan_pet_state (
  user_id text primary key,
  pet_id text not null,
  level integer not null default 1,
  experience integer not null default 0,
  mood text not null default 'calm',
  inventory jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists fan_record_verifications (
  id bigserial primary key,
  user_id text,
  record_url text,
  claimed_amount numeric,
  status text not null default 'pending',
  confidence numeric not null default 0,
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists fan_agent_messages (
  id bigserial primary key,
  conversation_id text not null,
  user_id text not null,
  card_id text,
  route text,
  user_message text not null,
  selected_skill_id text,
  assistant_reply text,
  app_context jsonb not null default '{}'::jsonb,
  skill_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists fan_memory_card_jobs (
  session_id text primary key,
  user_id text not null,
  memory_record_id text not null,
  style text not null default 'warm_album',
  status text not null default 'queued',
  progress numeric not null default 0,
  input_record jsonb not null default '{}'::jsonb,
  generated_card jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fan_daily_task_recommendations (
  id bigserial primary key,
  user_id text not null,
  pet_intimacy integer,
  current_star_id text,
  recommended_tasks jsonb not null default '[]'::jsonb,
  pet_suggestion text,
  created_at timestamptz not null default now()
);

create table if not exists fan_agent_loop_runs (
  id bigserial primary key,
  run_id text not null unique,
  user_id text not null,
  conversation_id text,
  card_id text,
  model text,
  status text not null,
  user_message text not null,
  final_reply text,
  used_skill_ids jsonb not null default '[]'::jsonb,
  app_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists fan_agent_loop_steps (
  id bigserial primary key,
  run_id text not null references fan_agent_loop_runs(run_id) on delete cascade,
  step_index integer not null,
  step_type text not null,
  skill_id text,
  reason text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
