-- Independent catalog review: expected effective privileges, not DDL text matching.
-- Read-only checks. Execute as the local test database owner, never via the portal.
do $$
declare
  role_name text;
  column_name text;
  privilege_name text;
  permitted boolean;
begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='onboarding_drafts' and c.relrowsecurity and c.relforcerowsecurity) then
    raise exception 'Draft table must enable and force RLS';
  end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='onboarding_drafts') <> 3 then
    raise exception 'Unexpected draft policy set';
  end if;
  foreach role_name in array array['anon','authenticated'] loop
    if has_schema_privilege(role_name,'private','CREATE') or has_schema_privilege(role_name,'public','CREATE') or has_table_privilege(role_name,'auth.users','SELECT') then
      raise exception 'Customer role has privileged schema or auth-table access: %',role_name;
    end if;
    foreach privilege_name in array array['DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege(role_name,'public.onboarding_drafts',privilege_name) then
        raise exception 'Unexpected table capability: % %',role_name,privilege_name;
      end if;
    end loop;
    foreach column_name in array array['owner_id','plan','content','revision','updated_at'] loop
      foreach privilege_name in array array['SELECT','INSERT','UPDATE'] loop
        permitted := role_name='authenticated' and (
          privilege_name='SELECT' or
          (privilege_name='INSERT' and column_name in ('owner_id','plan','content')) or
          (privilege_name='UPDATE' and column_name in ('plan','content')));
        if has_column_privilege(role_name,'public.onboarding_drafts',column_name,privilege_name) <> permitted then
          raise exception 'Unexpected column capability: % % %',role_name,column_name,privilege_name;
        end if;
      end loop;
    end loop;
    if has_function_privilege(role_name,'private.touch_draft()','EXECUTE') then
      raise exception 'Trigger function should not be directly executable by %',role_name;
    end if;
    if has_function_privilege(role_name,'private.is_verified_customer()','EXECUTE') <> (role_name='authenticated') or
       has_function_privilege(role_name,'private.valid_draft_content(jsonb,text)','EXECUTE') <> (role_name='authenticated') then
      raise exception 'Unexpected helper function access: %',role_name;
    end if;
  end loop;
  if has_schema_privilege('anon','private','USAGE') then raise exception 'Anonymous private-schema usage'; end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname='is_verified_customer' and p.prosecdef
      and p.pronargs=0 and p.proconfig = array['search_path=""']) then
    raise exception 'Missing narrowly scoped identity helper';
  end if;
end $$;
