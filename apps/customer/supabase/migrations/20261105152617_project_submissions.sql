-- Additive review workflow only. No payments, subscription or launch approval.
-- Do not apply to a hosted project without separate migration approval.
create function private.submission_complete(value jsonb, chosen_plan text) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select private.valid_draft_content(value, chosen_plan) is true
    and length(btrim(value->>'description', E' \t\n\r')) > 0
    and length(btrim(value->>'website_content', E' \t\n\r')) > 0
    and (length(btrim(value->>'phone', E' \t\n\r')) > 0 or length(btrim(value->>'contact_email', E' \t\n\r')) > 0)
    and (chosen_plan not in ('business','booking') or length(btrim(value->>'services', E' \t\n\r')) > 0)
    and (chosen_plan <> 'booking' or length(btrim(value->>'availability', E' \t\n\r')) > 0)
    and (chosen_plan <> 'store' or (length(btrim(value->>'products', E' \t\n\r')) > 0 and length(btrim(value->>'delivery', E' \t\n\r')) > 0));
$$;
revoke all on function private.submission_complete(jsonb,text) from public, anon, authenticated;

create table public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft_revision integer not null check (draft_revision > 0),
  plan text not null check (plan in ('starter','business','booking','store')),
  content jsonb not null,
  status text not null default 'submitted' check (status in ('submitted','changes_requested','ready_for_planning')),
  submitted_at timestamptz not null default now(),
  unique (owner_id, draft_revision),
  unique (id, owner_id)
);
create table public.project_events (
  submission_id uuid not null,
  owner_id uuid not null,
  event_number integer not null check (event_number in (1,2)),
  status text not null check (status in ('submitted','changes_requested','ready_for_planning')),
  note text not null check (length(note) between 1 and 2000),
  created_at timestamptz not null default now(),
  recorded_by text not null default session_user,
  primary key (submission_id, event_number),
  foreign key (submission_id, owner_id) references public.project_submissions(id, owner_id) on delete cascade
);
create index project_events_owner on public.project_events(owner_id, created_at);
alter table public.project_submissions enable row level security;
alter table public.project_submissions force row level security;
alter table public.project_events enable row level security;
alter table public.project_events force row level security;
revoke all on public.project_submissions, public.project_events from public, anon, authenticated;
grant select on public.project_submissions to authenticated;
grant insert (owner_id, draft_revision) on public.project_submissions to authenticated;
grant select (submission_id, owner_id, event_number, status, note, created_at) on public.project_events to authenticated;
create policy submissions_read on public.project_submissions for select to authenticated
  using ((select auth.uid()) = owner_id and (select private.is_verified_customer()));
create policy submissions_insert on public.project_submissions for insert to authenticated
  with check ((select auth.uid()) = owner_id and (select private.is_verified_customer()));
create policy events_read on public.project_events for select to authenticated
  using ((select auth.uid()) = owner_id and (select private.is_verified_customer()));

-- Narrow trigger capability: customers can request only their saved revision.
-- Locking that draft serializes saves and submissions; snapshots are server-copied.
create function private.prepare_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d public.onboarding_drafts; previous public.project_submissions;
begin
  if new.owner_id is distinct from auth.uid() or not private.is_verified_customer() then
    raise exception using errcode='42501', message='Verified owner required';
  end if;
  select * into d from public.onboarding_drafts where owner_id=auth.uid() for update;
  if not found or d.revision <> new.draft_revision then
    raise exception using errcode='40001', message='Saved draft changed; reload before submitting';
  end if;
  select * into previous from public.project_submissions where owner_id=auth.uid() order by draft_revision desc limit 1;
  if found and (previous.status <> 'changes_requested' or previous.draft_revision >= d.revision) then
    raise exception using errcode='40001', message='Already submitted; wait for review or save requested changes';
  end if;
  if private.submission_complete(d.content,d.plan) is not true then
    raise exception using errcode='23514', message='Complete the submission checklist';
  end if;
  new.plan := d.plan; new.content := d.content; new.status := 'submitted'; new.submitted_at := now();
  return new;
end;
$$;
revoke all on function private.prepare_submission() from public, anon, authenticated;
create trigger prepare_submission before insert on public.project_submissions for each row execute function private.prepare_submission();

create function private.record_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.project_events(submission_id,owner_id,event_number,status,note)
    values(new.id,new.owner_id,1,'submitted','Submitted for review. No payment, subscription or launch approval.');
  return new;
end;
$$;
revoke all on function private.record_submission() from public, anon, authenticated;
create trigger record_submission after insert on public.project_submissions for each row execute function private.record_submission();

-- Database-owner operation only; not exposed through the customer Data API.
-- SECURITY INVOKER deliberately adds no privilege. No operator grants are created.
create function private.review_submission(target uuid, outcome text, customer_note text) returns void
language plpgsql security invoker set search_path = '' as $$
declare project public.project_submissions;
begin
  if outcome is null or outcome not in ('changes_requested','ready_for_planning') or
     customer_note is null or length(btrim(customer_note, E' \t\n\r')) not between 1 and 2000 then
    raise exception using errcode='23514', message='Valid review outcome and customer-visible note required';
  end if;
  select * into project from public.project_submissions where id=target for update;
  if not found or project.status <> 'submitted' then
    raise exception using errcode='40001', message='Submission missing or already reviewed';
  end if;
  update public.project_submissions set status=outcome where id=target;
  insert into public.project_events(submission_id,owner_id,event_number,status,note)
    values(project.id,project.owner_id,2,outcome,btrim(customer_note));
end;
$$;
revoke all on function private.review_submission(uuid,text,text) from public, anon, authenticated, service_role;
