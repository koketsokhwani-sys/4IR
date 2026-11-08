"use client";
import { usePrivateHistory, PrivateHistoryNotice } from "../../lib/use-private-history";
import { useEffect, useState } from "react";
import { fields, applicable, type Draft, type Field } from "../../lib/draft";
import { projectStatus, type ProjectSubmission, type ProjectEvent } from "../../lib/project";
type State = { account_id: string; revision: number; draft: Draft | null; missing: string[]; submissions: ProjectSubmission[]; events: ProjectEvent[] };
function Snapshot({ draft }: { draft: Draft }) {
  return <dl><dt>Package</dt><dd>{draft.plan}</dd>{(Object.keys(fields) as Field[]).filter(key => applicable(draft.plan,key)).map(key =>
    <div key={key}><dt>{fields[key].label}</dt><dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{draft[key] || "Not supplied"}</dd></div>)}</dl>;
}
export function Dashboard() {
  const { restoring, restoringRef } = usePrivateHistory();
  const [state,setState] = useState<State | null>(null);
  const [busy,setBusy] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [confirmed,setConfirmed] = useState(false);
  const [message,setMessage] = useState("");
  const [failed,setFailed] = useState(false);
  async function load() {
    setBusy(true); setConfirmed(false); setFailed(false); setState(null);
    try {
      const response = await fetch("/api/project", { cache: "no-store" });
      if (response.status === 401) { location.replace("/account?mode=signin"); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setState(data);
    } catch (e) { setFailed(true); setMessage(e instanceof Error ? e.message : "Unable to load the project. Please retry."); }
    finally { setLoaded(true); setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  if (restoring) return <PrivateHistoryNotice />;
  const latest = state?.submissions[0];
  const canSubmit = !!state?.draft && !state.missing.length && (!latest || (latest.status === "changes_requested" && state.revision > latest.draft_revision));
  return <>
    <p role={failed ? "alert" : "status"}>{!loaded ? "Loading your project…" : message}</p>
    <button className="secondary" disabled={busy} onClick={() => { setMessage(""); void load(); }}>Refresh project</button>
    {state && <>
      <h2>{latest ? projectStatus[latest.status] : "Draft — not submitted"}</h2>
      {latest?.status === "submitted" && <p>4IR has your saved submission. Wait for review before submitting again. You can still edit your draft; those edits do not change the submitted copy.</p>}
      {latest?.status === "ready_for_planning" && <p>Your information is ready for a planning conversation. This is not payment, development or launch approval.</p>}
      {latest?.status === "changes_requested" && <p>Read the review note below, update and save your draft, then submit the new revision.</p>}
      <h2>Saved draft{state.revision ? ` · revision ${state.revision}` : ""}</h2>
      {state.draft && <details><summary>Review saved information</summary><Snapshot draft={state.draft} /></details>}
      {!!state.missing.length && <><p>Before you can submit:</p><ul>{state.missing.map(item => <li key={item}>{item}</li>)}</ul></>}
      {canSubmit && <form onSubmit={async e => {
        e.preventDefault(); if (restoringRef.current || !confirmed || busy) return; setBusy(true); setFailed(false); setMessage("");
        try {
          const response = await fetch("/api/project", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expected_revision: state.revision, expected_account_id: state.account_id }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setMessage(data.message); await load();
        } catch (e) {
          setFailed(true); setMessage("Submission could not be confirmed. Refresh the project before retrying." + (e instanceof Error ? ` ${e.message}` : ""));
          setState(null); setConfirmed(false);
        } finally { setBusy(false); }
      }}>
        <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: "auto", justifySelf: "start" }} />I have reviewed the saved information and want to submit it for review.</label>
        <button disabled={busy || !confirmed}>Submit saved draft for review</button>
      </form>}
      <h2>Submission history</h2><p>Showing your latest 20 submissions. Each submitted copy stays unchanged.</p>
      {!state.submissions.length && <p>No submissions yet.</p>}
      {state.submissions.map(project => <section key={project.id}>
        <h3>Revision {project.draft_revision} · {projectStatus[project.status]}</h3>
        <details><summary>View submitted information</summary><Snapshot draft={{ plan: project.plan, ...project.content }} /></details>
        <ol>{state.events.filter(event => event.submission_id === project.id).map(event => <li key={event.event_number}>
          <strong>{projectStatus[event.status]}</strong><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{event.note}</p><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
        </li>)}</ol>
      </section>)}
    </>}
  </>;
}
