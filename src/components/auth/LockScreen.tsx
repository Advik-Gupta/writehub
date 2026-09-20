"use client";

import { Lock, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { signOut, unlock, useSession } from "@/lib/session";
import { Button, inputClass } from "../ui";
import { AuthShell } from "./AuthShell";

export function LockScreen() {
  const email = useSession((state) => state.email);
  const appLock = useSession((state) => state.appLock);
  const [mode, setMode] = useState<"account" | "app">(appLock ? "app" : "account");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await unlock(password, mode);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not unlock");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={submit} className="w-full max-w-[360px] space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-accent" />
          <h1 className="text-lg font-semibold tracking-tight">Workspace locked</h1>
        </div>
        <p className="text-[13px] leading-relaxed text-mute">
          The key that decrypts your writing is held in memory only. Enter your {mode === "app" ? "app password" : "account password"} to unlock {email}.
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          placeholder={mode === "app" ? "App password" : "Account password"}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          {busy ? "Unlocking" : "Unlock"}
        </Button>
        <div className="flex items-center justify-between text-xs text-mute">
          {appLock ? (
            <button type="button" onClick={() => setMode(mode === "app" ? "account" : "app")} className="hover:text-fg">
              {mode === "app" ? "Use account password" : "Use app password"}
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={() => signOut()} className="hover:text-fg">
            Sign out
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
