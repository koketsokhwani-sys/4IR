-- Candidate schema for a dedicated LOCAL 4IR Supabase project only.
-- Not an applied/versioned migration. Test here; generate a migration with the CLI
-- after a local stack is available and advisors pass. Never run against Munchies.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Narrow privileged lookup: customers must not get SELECT access to auth.users.
-- No argument can select another identity; identity comes only from auth.uid().
create function private.is_verified_customer() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u where u.id = (select auth.uid())
    and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false));
$$;
revoke all on function private.is_verified_customer() from public, anon;
grant execute on function private.is_verified_customer() to authenticated;

create function private.valid_draft_content(value jsonb, chosen_plan text) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select jsonb_typeof(value) = 'object'
    and (select count(*) = 10 from jsonb_object_keys(value))
    and not exists (
      select 1 from jsonb_each(value) as e(key,item)
      where jsonb_typeof(item) <> 'string' or key not in
        ('contact_name','phone','business_name','contact_email','description','website_content','services','availability','products','delivery')
      or length(item #>> '{}') > case key
        when 'contact_name' then 120 when 'phone' then 40 when 'business_name' then 160
        when 'contact_email' then 254 when 'description' then 2000 when 'delivery' then 2000 else 4000 end
    )
    and length(btrim(value->>'contact_name')) > 0
    and length(btrim(value->>'business_name')) > 0
    and (value->>'contact_email' = '' or value->>'contact_email' ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    and (chosen_plan = 'store' or (value->>'products' = '' and value->>'delivery' = ''))
    and (chosen_plan = 'booking' or value->>'availability' = '')
    and (chosen_plan in ('business','booking') or value->>'services' = '');
$$;
revoke all on function private.valid_draft_content(jsonb,text) from public, anon;
grant execute on function private.valid_draft_content(jsonb,text) to authenticated;

create table public.onboarding_drafts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('starter','business','booking','store')),
  content jsonb not null check (private.valid_draft_content(content,plan) is true),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.onboarding_drafts enable row level security;
alter table public.onboarding_drafts force row level security;
revoke all on public.onboarding_drafts from public, anon, authenticated;
grant select on public.onboarding_drafts to authenticated;
grant insert (owner_id, plan, content), update (plan, content) on public.onboarding_drafts to authenticated;
create policy customer_read on public.onboarding_drafts for select to authenticated
  using ((select auth.uid()) = owner_id and (select private.is_verified_customer()));
create policy customer_insert on public.onboarding_drafts for insert to authenticated
  with check ((select auth.uid()) = owner_id and (select private.is_verified_customer()));
create policy customer_update on public.onboarding_drafts for update to authenticated
  using ((select auth.uid()) = owner_id and (select private.is_verified_customer()))
  with check ((select auth.uid()) = owner_id and (select private.is_verified_customer()));
create function private.touch_draft() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  if TG_OP = 'UPDATE' then new.revision = old.revision + 1;
  else new.revision = 1; end if;
  return new;
end;
$$;
revoke all on function private.touch_draft() from public, anon;
create trigger touch_draft before insert or update on public.onboarding_drafts
  for each row execute function private.touch_draft();
-- No storage bucket or policies: uploads remain unavailable, not public by default.
-- No billing, roles, approval status or administrator privileges in customer data.
