create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'partnership_status') then
    create type public.partnership_status as enum ('pending', 'active', 'declined', 'revoked');
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_type') then
    create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
  end if;

  if not exists (select 1 from pg_type where typname = 'goal_status') then
    create type public.goal_status as enum ('active', 'completed', 'archived');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  avatar_url text,
  preferred_weight_unit text not null default 'lbs',
  daily_calorie_goal integer not null default 2000 check (daily_calorie_goal > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists preferred_weight_unit text not null default 'lbs';

alter table public.profiles
  add column if not exists daily_calorie_goal integer not null default 2000;

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references public.profiles (id) on delete cascade,
  user_two_id uuid not null references public.profiles (id) on delete cascade,
  status public.partnership_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint partnerships_users_different check (user_one_id <> user_two_id)
);

create unique index if not exists partnerships_active_user_one_idx
  on public.partnerships (user_one_id)
  where status = 'active';

create unique index if not exists partnerships_active_user_two_idx
  on public.partnerships (user_two_id)
  where status = 'active';

create table if not exists public.partnership_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_email text not null,
  status public.partnership_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  workout_date date not null default current_date,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_name text not null,
  muscle_group text,
  exercise_order integer not null default 0 check (exercise_order >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_order integer not null default 0 check (set_order >= 0),
  reps integer check (reps >= 0),
  weight numeric(8,2) check (weight >= 0),
  unit text not null default 'lbs',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null default current_date,
  meal_type public.meal_type not null,
  food_name text not null,
  brand text,
  external_food_id text,
  source text not null default 'fatsecret',
  serving_amount numeric(8,2) not null default 1 check (serving_amount > 0),
  serving_unit text not null default 'serving',
  calories integer not null default 0 check (calories >= 0),
  protein numeric(8,2) not null default 0 check (protein >= 0),
  carbs numeric(8,2) not null default 0 check (carbs >= 0),
  fat numeric(8,2) not null default 0 check (fat >= 0),
  fiber numeric(8,2) check (fiber >= 0),
  sugar numeric(8,2) check (sugar >= 0),
  sodium numeric(8,2) check (sodium >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  goal_type text,
  target_value numeric(10,2) not null,
  current_value numeric(10,2) not null default 0,
  unit text not null,
  deadline date,
  is_shared boolean not null default false,
  status public.goal_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

create or replace function public.is_active_partner(user_a uuid, user_b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.partnerships
    where status = 'active'
      and (
        (user_one_id = user_a and user_two_id = user_b)
        or (user_one_id = user_b and user_two_id = user_a)
      )
  );
$$;

create or replace function public.user_has_active_partner(target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.partnerships
    where status = 'active'
      and target_user_id in (user_one_id, user_two_id)
  );
$$;

create or replace function public.enforce_single_active_partnership()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' then
    if exists (
      select 1
      from public.partnerships existing
      where existing.status = 'active'
        and existing.id <> new.id
        and (
          new.user_one_id in (existing.user_one_id, existing.user_two_id)
          or new.user_two_id in (existing.user_one_id, existing.user_two_id)
        )
    ) then
      raise exception 'Each user can only have one active partner.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_invite_partner_availability()
returns trigger
language plpgsql
as $$
declare
  recipient_profile_id uuid;
begin
  if new.status = 'pending' then
    if public.user_has_active_partner(new.sender_id) then
      raise exception 'You already have an active partner.';
    end if;

    select id
    into recipient_profile_id
    from public.profiles
    where lower(email) = lower(new.recipient_email)
    limit 1;

    if recipient_profile_id is not null and public.user_has_active_partner(recipient_profile_id) then
      raise exception 'That person already has an active partner.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), 'FitTogether User')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists partnerships_touch_updated_at on public.partnerships;
create trigger partnerships_touch_updated_at before update on public.partnerships
  for each row execute procedure public.touch_updated_at();

drop trigger if exists partnerships_enforce_single_active on public.partnerships;
create trigger partnerships_enforce_single_active
  before insert or update on public.partnerships
  for each row execute procedure public.enforce_single_active_partnership();

drop trigger if exists partnership_invites_touch_updated_at on public.partnership_invites;
create trigger partnership_invites_touch_updated_at before update on public.partnership_invites
  for each row execute procedure public.touch_updated_at();

drop trigger if exists partnership_invites_enforce_partner_availability on public.partnership_invites;
create trigger partnership_invites_enforce_partner_availability
  before insert or update on public.partnership_invites
  for each row execute procedure public.enforce_invite_partner_availability();

drop trigger if exists workouts_touch_updated_at on public.workouts;
create trigger workouts_touch_updated_at before update on public.workouts
  for each row execute procedure public.touch_updated_at();

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at before update on public.goals
  for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.partnerships enable row level security;
alter table public.partnership_invites enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.exercise_sets enable row level security;
alter table public.food_entries enable row level security;
alter table public.goals enable row level security;
alter table public.nudges enable row level security;

drop policy if exists "profiles_select_self_or_partner" on public.profiles;
create policy "profiles_select_self_or_partner" on public.profiles
  for select using (auth.uid() = id or public.is_active_partner(auth.uid(), id));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "partnerships_select_members" on public.partnerships;
create policy "partnerships_select_members" on public.partnerships
  for select using (auth.uid() in (user_one_id, user_two_id));

drop policy if exists "partnerships_insert_members" on public.partnerships;
create policy "partnerships_insert_members" on public.partnerships
  for insert with check (auth.uid() in (user_one_id, user_two_id));

drop policy if exists "partnerships_update_members" on public.partnerships;
create policy "partnerships_update_members" on public.partnerships
  for update using (auth.uid() in (user_one_id, user_two_id))
  with check (auth.uid() in (user_one_id, user_two_id));

drop policy if exists "partnership_invites_select_sender_or_recipient" on public.partnership_invites;
create policy "partnership_invites_select_sender_or_recipient" on public.partnership_invites
  for select using (
    auth.uid() = sender_id
    or lower(recipient_email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
  );

drop policy if exists "partnership_invites_insert_sender" on public.partnership_invites;
create policy "partnership_invites_insert_sender" on public.partnership_invites
  for insert with check (auth.uid() = sender_id);

drop policy if exists "partnership_invites_update_sender_or_recipient" on public.partnership_invites;
create policy "partnership_invites_update_sender_or_recipient" on public.partnership_invites
  for update using (
    auth.uid() = sender_id
    or lower(recipient_email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
  )
  with check (
    auth.uid() = sender_id
    or lower(recipient_email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
  );

drop policy if exists "workouts_select_owner_or_partner" on public.workouts;
create policy "workouts_select_owner_or_partner" on public.workouts
  for select using (auth.uid() = user_id or public.is_active_partner(auth.uid(), user_id));

drop policy if exists "workouts_insert_owner" on public.workouts;
create policy "workouts_insert_owner" on public.workouts
  for insert with check (auth.uid() = user_id);

drop policy if exists "workouts_update_owner" on public.workouts;
create policy "workouts_update_owner" on public.workouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workouts_delete_owner" on public.workouts;
create policy "workouts_delete_owner" on public.workouts
  for delete using (auth.uid() = user_id);

drop policy if exists "workout_exercises_select_owner_or_partner" on public.workout_exercises;
create policy "workout_exercises_select_owner_or_partner" on public.workout_exercises
  for select using (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_exercises.workout_id
        and (workouts.user_id = auth.uid() or public.is_active_partner(auth.uid(), workouts.user_id))
    )
  );

drop policy if exists "workout_exercises_modify_owner" on public.workout_exercises;
create policy "workout_exercises_modify_owner" on public.workout_exercises
  for all using (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
        and workouts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
        and workouts.user_id = auth.uid()
    )
  );

drop policy if exists "exercise_sets_select_owner_or_partner" on public.exercise_sets;
create policy "exercise_sets_select_owner_or_partner" on public.exercise_sets
  for select using (
    exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = exercise_sets.workout_exercise_id
        and (workouts.user_id = auth.uid() or public.is_active_partner(auth.uid(), workouts.user_id))
    )
  );

drop policy if exists "exercise_sets_modify_owner" on public.exercise_sets;
create policy "exercise_sets_modify_owner" on public.exercise_sets
  for all using (
    exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = exercise_sets.workout_exercise_id
        and workouts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      where workout_exercises.id = exercise_sets.workout_exercise_id
        and workouts.user_id = auth.uid()
    )
  );

drop policy if exists "food_entries_select_owner_or_partner" on public.food_entries;
create policy "food_entries_select_owner_or_partner" on public.food_entries
  for select using (auth.uid() = user_id or public.is_active_partner(auth.uid(), user_id));

drop policy if exists "food_entries_modify_owner" on public.food_entries;
create policy "food_entries_modify_owner" on public.food_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "goals_select_owner_or_shared_partner" on public.goals;
create policy "goals_select_owner_or_shared_partner" on public.goals
  for select using (
    auth.uid() = owner_user_id
    or (is_shared and public.is_active_partner(auth.uid(), owner_user_id))
  );

drop policy if exists "goals_modify_owner" on public.goals;
create policy "goals_modify_owner" on public.goals
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "nudges_select_sender_or_recipient" on public.nudges;
create policy "nudges_select_sender_or_recipient" on public.nudges
  for select using (auth.uid() in (sender_id, recipient_id));

drop policy if exists "nudges_insert_active_partner" on public.nudges;
create policy "nudges_insert_active_partner" on public.nudges
  for insert with check (auth.uid() = sender_id and public.is_active_partner(sender_id, recipient_id));

drop policy if exists "nudges_update_recipient" on public.nudges;
create policy "nudges_update_recipient" on public.nudges
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
