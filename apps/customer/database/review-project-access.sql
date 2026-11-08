-- Read-only catalog assertions for the workflow's effective customer permissions.
do $$
declare role_name text; table_name text; col text; operation text; allowed boolean;
begin
  foreach table_name in array array['project_submissions','project_events'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=table_name and c.relrowsecurity and c.relforcerowsecurity) then
      raise exception 'Project RLS missing: %',table_name;
    end if;
    foreach role_name in array array['anon','authenticated'] loop
      foreach operation in array array['UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
        if has_table_privilege(role_name,'public.'||table_name,operation) then raise exception 'Unexpected project table privilege'; end if;
      end loop;
      for col in select a.attname from pg_attribute a where a.attrelid=('public.'||table_name)::regclass and a.attnum>0 and not a.attisdropped loop
        foreach operation in array array['SELECT','INSERT','UPDATE'] loop
          allowed := role_name='authenticated' and ((operation='SELECT' and col <> 'recorded_by') or
            (operation='INSERT' and table_name='project_submissions' and col in ('owner_id','draft_revision')));
          if has_column_privilege(role_name,'public.'||table_name,col,operation) <> allowed then raise exception 'Unexpected project column privilege: % % % %',role_name,table_name,col,operation; end if;
        end loop;
      end loop;
    end loop;
  end loop;
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if has_function_privilege(role_name,'private.review_submission(uuid,text,text)','EXECUTE') then raise exception 'Operator review exposed to %',role_name; end if;
  end loop;
end $$;
