"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

// A restored document must stop exposing private content before attempting a
// reload: beforeunload navigation can be cancelled. Keep the notice mounted
// even if an in-flight read completes; only a fresh document unlocks the UI.
export function usePrivateHistory() {
  const [restoring, setRestoring] = useState(false);
  const restoringRef = useRef(false);
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (!event.persisted || restoringRef.current) return;
      restoringRef.current = true;
      flushSync(() => setRestoring(true));
      window.location.reload();
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);
  return { restoring, restoringRef };
}

export function PrivateHistoryNotice() {
  return <section role="alert">
    <p>For your privacy, this restored page is locked. Reload to check your current account and saved information.</p>
    <button onClick={() => window.location.reload()}>Reload private page</button>
  </section>;
}
