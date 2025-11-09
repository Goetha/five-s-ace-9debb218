-- Ensure company criteria are created when a model is linked to a company and optionally linked to all environments
-- This migration creates helper functions and triggers, and backfills existing data.

-- 1) Function: ensure_company_criteria_for_model
create or replace function public.ensure_company_criteria_for_model(p_company_id uuid, p_model_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert missing company_criteria copied from master_model_criteria/master_criteria
  insert into public.company_criteria (
    company_id,
    origin,
    name,
    description,
    senso,
    scoring_type,
    tags,
    status,
    master_criterion_id,
    origin_model_id,
    created_by,
    origin_model_name
  )
  select
    p_company_id as company_id,
    'master'::text as origin,
    mc.name,
    mc.description,
    mc.senso,
    mc.scoring_type,
    mc.tags,
    'active'::text as status,
    mc.id as master_criterion_id,
    p_model_id as origin_model_id,
    null::uuid as created_by,
    mm.name as origin_model_name
  from public.master_model_criteria mmc
  join public.master_criteria mc on mc.id = mmc.criterion_id
  join public.master_models mm on mm.id = mmc.model_id
  where mmc.model_id = p_model_id
    and not exists (
      select 1 from public.company_criteria cc
      where cc.company_id = p_company_id
        and cc.master_criterion_id = mc.id
        and cc.origin_model_id = p_model_id
    );
end;
$$;

-- 2) Function: link_model_criteria_to_all_environments
create or replace function public.link_model_criteria_to_all_environments(p_company_id uuid, p_model_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root_env uuid;
begin
  -- Ensure company criteria exist first
  perform public.ensure_company_criteria_for_model(p_company_id, p_model_id);

  -- Identify company root environment (parent_id is null)
  select e.id into v_root_env
  from public.environments e
  where e.company_id = p_company_id and e.parent_id is null
  limit 1;

  -- Link all criteria from this model to all level-1 environments (children of root)
  insert into public.environment_criteria (environment_id, criterion_id)
  select env.id as environment_id, cc.id as criterion_id
  from public.company_criteria cc
  cross join lateral (
    select e.id
    from public.environments e
    where e.company_id = p_company_id
      and (case when v_root_env is null then e.parent_id is null else e.parent_id = v_root_env end)
  ) as env
  where cc.company_id = p_company_id
    and cc.origin_model_id = p_model_id
    and not exists (
      select 1 from public.environment_criteria ec
      where ec.environment_id = env.id and ec.criterion_id = cc.id
    );
end;
$$;

-- 3) Trigger on company_models to auto-copy and link
create or replace function public.tg_after_company_models_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.link_model_criteria_to_all_environments(new.company_id, new.model_id);
  return new;
end;
$$;

-- Drop if exists then create trigger
drop trigger if exists trg_after_company_models_insert on public.company_models;
create trigger trg_after_company_models_insert
after insert on public.company_models
for each row execute function public.tg_after_company_models_insert();

-- 4) Backfill for existing links
do $$
DECLARE r record;
BEGIN
  for r in (
    select company_id, model_id from public.company_models
  ) loop
    perform public.link_model_criteria_to_all_environments(r.company_id, r.model_id);
  end loop;
END $$;
