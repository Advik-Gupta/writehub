"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/session";
import { Button, inputClass } from "../ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not sign in");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-[360px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-[13px] text-mute">Your workspace unlocks on this device once you sign in.</p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs text-mute">Email</span>
        <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs text-mute">Password</span>
        <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
      </label>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
        {busy ? "Unlocking" : "Sign in"}
      </Button>
      <p className="text-center text-xs text-mute">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
