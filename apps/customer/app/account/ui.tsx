"use client";
import { useState } from "react";
export function AccountForm({
  mode,
  expired,
  restricted = false,
}: {
  mode: string;
  expired: boolean;
  restricted?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    expired ? "That link has expired or is invalid. Request a new one." : "",
  );
  const title =
    mode === "signin"
      ? "Welcome back."
      : mode === "recover"
        ? "Reset your password."
        : mode === "password"
          ? "Choose a new password."
          : "Start your next chapter.";
  return (
    <>
      <h1>{title}</h1>
      <p>
        {restricted ? "Use your approved test account. Account creation and password recovery are unavailable in this pilot. Contact the pilot owner for help." : "Verify your email before saving business details. No payment will be taken."}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          const form = event.currentTarget;
          const data = Object.fromEntries(new FormData(form));
          try {
            const response = await fetch("/api/" + mode, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const result = await response.json();
            if (result.redirect) {
              location.assign(result.redirect);
              return;
            }
            setMessage(result.error || result.message);
            if (response.ok) form.reset();
          } catch {
            setMessage("Unable to connect. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode !== "password" && (
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
        )}
        {mode !== "recover" && (
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              aria-describedby="password-help"
            />
          </label>
        )}
        {mode !== "recover" && (
          <small id="password-help">Use 12–128 characters.</small>
        )}
        <button disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "recover"
                ? "Send recovery email"
                : mode === "password"
                  ? "Save new password"
                  : "Create test account"}
        </button>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </form>
      <nav aria-label="Account options">
        <a href="/account?mode=signin">Sign in</a>
        {!restricted && <a href="/account?mode=register">Create account</a>}
        {!restricted && <a href="/account?mode=recover">Forgot password?</a>}
      </nav>
    </>
  );
}
