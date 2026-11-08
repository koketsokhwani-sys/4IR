"use client";
import { usePrivateHistory, PrivateHistoryNotice } from "../../lib/use-private-history";
import { useEffect, useRef, useState } from "react";
import {
  fields,
  applicable,
  type Draft,
  type Field,
  type PlanId,
} from "../../lib/draft";
import { plans } from "../../../../src/lib/content";
export function Onboarding() {
  const { restoring, restoringRef } = usePrivateHistory();
  const discarding = useRef(false);
  const [draft, setDraft] = useState<Partial<Draft>>({ plan: "starter" });
  const [revision, setRevision] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [conflict, setConflict] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/draft", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          location.replace("/account?mode=signin");
          return;
        }
        const data = await r.json();
        if (!alive) return;
        if (!r.ok) {
          setFailed(true);
          setMessage(data.error);
          return;
        }
        if (data.draft) setDraft(data.draft);
        setRevision(data.revision);
        setAccountId(data.account_id);
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
          setMessage("Unable to load your draft. Reload to try again.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && !discarding.current && !restoringRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  if (restoring) return <PrivateHistoryNotice />;
  if (loading) return <p role="status">Loading your draft…</p>;
  if (failed)
    return (
      <>
        <p role="alert">{message}</p>
        <button onClick={() => location.reload()}>Retry loading draft</button>
      </>
    );
  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (restoringRef.current) return;
          setBusy(true);
          setMessage("");
          try {
            const r = await fetch("/api/draft", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...draft,
                expected_revision: revision,
                expected_account_id: accountId,
              }),
            });
            const result = await r.json();
            setMessage(result.error || result.message);
            setConflict(r.status === 409);
            setSessionExpired(r.status === 401);
            if (r.ok) {
              setDirty(false);
              setDraft(result.draft);
              setRevision(result.revision);
            }
          } catch {
            setMessage(
              "Draft not saved. Please retry; your entries remain on screen.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Your package
          <select
            value={draft.plan}
            disabled={busy}
            onChange={(e) => {
              setDraft({ ...draft, plan: e.target.value as PlanId });
              setDirty(true);
              setMessage(
                "Package changed. Saving clears content that does not apply to the new package.",
              );
            }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — R{p.price}/month
              </option>
            ))}
          </select>
        </label>
        <p>
          Package selection is a preference, not an active subscription. You
          will confirm pricing before any future checkout.
        </p>
        {(Object.keys(fields) as Field[])
          .filter((key) => applicable(draft.plan!, key))
          .map((key) => (
            <label key={key}>
              {fields[key].label}
              {["contact_name", "business_name"].includes(key)
                ? " (required)"
                : " (optional)"}
              {fields[key].max > 254 ? (
                <textarea
                  name={key}
                  maxLength={fields[key].max}
                  value={draft[key] ?? ""}
                  disabled={busy}
                  onChange={(e) => {
                    setDraft({ ...draft, [key]: e.target.value });
                    setDirty(true);
                  }}
                />
              ) : (
                <input
                  name={key}
                  type={
                    key === "contact_email"
                      ? "email"
                      : key === "phone"
                        ? "tel"
                        : "text"
                  }
                  maxLength={fields[key].max}
                  required={["contact_name", "business_name"].includes(key)}
                  value={draft[key] ?? ""}
                  disabled={busy}
                  onChange={(e) => {
                    setDraft({ ...draft, [key]: e.target.value });
                    setDirty(true);
                  }}
                />
              )}
            </label>
          ))}
        <p>
          Logo and photo uploads are not available in this foundation. Do not
          enter passwords, card details or sensitive customer information.
        </p>
        <button disabled={busy || conflict}>
          {busy ? "Saving…" : "Save draft"}
        </button>
        {conflict && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (
                confirm(
                  "Reload the latest draft? Copy any unsaved changes first; reloading will discard them.",
                )
              ) {
                discarding.current = true;
                setDirty(false);
                location.reload();
              }
            }}
          >
            Reload latest draft
          </button>
        )}
        {sessionExpired && (
          <p>
            Your entries remain here.{" "}
            <a
              href="/account?mode=signin"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign in in a new tab
            </a>
            , then return and save again.
          </p>
        )}
        <p role="status" aria-live="polite">
          {message}
        </p>
        <small>
          {dirty ? "You have unsaved changes." : "No unsaved changes."}
        </small>
      </form>
      <button
        className="secondary"
        disabled={busy}
        onClick={async () => {
          if (restoringRef.current) return;
          if (dirty && !confirm("Sign out and discard unsaved changes?"))
            return;
          setBusy(true);
          try {
            const r = await fetch("/api/signout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            const data = await r.json();
            if (r.ok) {
              setDirty(false);
              discarding.current = true;
              location.assign(data.redirect);
            } else setMessage(data.error);
          } catch {
            setMessage("Could not sign out. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Sign out
      </button>
    </>
  );
}
