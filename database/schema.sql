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
