-- Auto-link existing company models to newly created environments
create or replace function public.tg_after_environments_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Link all active company_criteria for this company to the new environment
  insert into public.environment_criteria (environment_id, criterion_id)
  select new.id, cc.id
  from public.company_criteria cc
  where cc.company_id = new.company_id
    and cc.status = 'active'
  on conflict (environment_id, criterion_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_after_environments_insert on public.environments;
create trigger trg_after_environments_insert
after insert on public.environments
for each row execute function public.tg_after_environments_insert();
