"use client";

import { ArrowLeft, ArrowRight, Check, LoaderCircle, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_NAME } from "@/lib/config";
import { seedWorkspace } from "@/lib/seed";
import { register } from "@/lib/session";
import { DEFAULT_SETTINGS, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Checkbox, inputClass, spring } from "../ui";
import { PrivacyNotes } from "./PrivacyNotes";

const PURPOSES = ["Think through ideas", "Draft long form work", "Organise research", "Publish what I write", "Keep a private journal"];
const WRITING = ["Essays", "Debate cases", "Fiction", "Research notes", "Blog posts", "Journal", "Course work", "Newsletter", "Screenplays", "Poetry"];
const CADENCE = ["Every day", "A few times a week", "Weekly", "In bursts"];
const EXPERIENCE = ["Just starting out", "Comfortable writer", "I write professionally"];

const STEPS = ["About you", "What you write", "How you work", "Your privacy", "Create account"];

const emptyProfile: Profile = { name: "", purpose: "", writing: [], cadence: "", experience: "", focus: "" };

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
        active ? "border-accent/60 bg-accent/12 text-accent" : "border-line-strong text-dim hover:border-faint hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[13px] font-medium text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-mute">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function SignupFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [acknowledged, setAcknowledged] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (changes: Partial<Profile>) => setProfile((current) => ({ ...current, ...changes }));
  const toggleWriting = (item: string) =>
    patch({ writing: profile.writing.includes(item) ? profile.writing.filter((entry) => entry !== item) : [...profile.writing, item] });

  const canContinue = [
    profile.name.trim().length > 0 && profile.purpose.length > 0,
    profile.writing.length > 0,
    profile.cadence.length > 0 && profile.experience.length > 0,
    acknowledged,
    email.trim().length > 3 && password.length >= 10 && password === confirm,
  ][step];

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await register({ email: email.trim(), password, profile, settings: { ...DEFAULT_SETTINGS, author: profile.name.trim() } });
      await seedWorkspace();
      router.replace("/");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not create the account");
      setBusy(false);
    }
  };

  const panels = [
    <div key="about" className="space-y-6">
      <Field label="What should we call you?" hint="Used as the author name on your documents and shared pages.">
        <input autoFocus value={profile.name} onChange={(event) => patch({ name: event.target.value })} placeholder="Your name" className={inputClass} />
      </Field>
      <Field label={`Why are you here?`} hint="This tunes nothing automatically, it just helps you name what you are doing.">
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((item) => (
            <Chip key={item} active={profile.purpose === item} onClick={() => patch({ purpose: item })}>
              {item}
            </Chip>
          ))}
        </div>
      </Field>
    </div>,
    <div key="writing" className="space-y-6">
      <Field label="What do you want to write?" hint="Pick as many as you like.">
        <div className="flex flex-wrap gap-2">
          {WRITING.map((item) => (
            <Chip key={item} active={profile.writing.includes(item)} onClick={() => toggleWriting(item)}>
              {item}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Anything specific you are working towards?" hint="Optional. A book, a thesis, a weekly essay habit.">
        <textarea
          value={profile.focus}
          onChange={(event) => patch({ focus: event.target.value })}
          rows={3}
          placeholder="Finish the first draft of a novel by spring"
          className={cn(inputClass, "resize-none")}
        />
      </Field>
    </div>,
    <div key="work" className="space-y-6">
      <Field label="How often do you write?">
        <div className="flex flex-wrap gap-2">
          {CADENCE.map((item) => (
            <Chip key={item} active={profile.cadence === item} onClick={() => patch({ cadence: item })}>
              {item}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="How would you describe yourself?">
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE.map((item) => (
            <Chip key={item} active={profile.experience === item} onClick={() => patch({ experience: item })}>
              {item}
            </Chip>
          ))}
        </div>
      </Field>
    </div>,
    <div key="privacy" className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-accent" />
        <p className="text-[13px] font-medium">How {APP_NAME} handles your writing</p>
      </div>
      <PrivacyNotes />
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-strong bg-bg/50 p-3">
        <Checkbox checked={acknowledged} onChange={setAcknowledged} className="mt-0.5" />
        <span className="text-xs leading-relaxed text-dim">
          I understand that my password is the only way to decrypt my writing, that nobody can reset it for me, and that losing it means losing access to everything
          in my account.
        </span>
      </label>
    </div>,
    <div key="account" className="space-y-5">
      <Field label="Email" hint="Used to sign in. It is the one field stored in readable form.">
        <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
      </Field>
      <Field label="Password" hint="At least 10 characters. Long and memorable beats short and clever.">
        <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
      </Field>
      <Field label="Confirm password">
        <input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={inputClass} />
      </Field>
      {password.length > 0 && password.length < 10 && <p className="text-xs text-warn">Use at least 10 characters.</p>}
      {confirm.length > 0 && password !== confirm && <p className="text-xs text-danger">Those passwords do not match.</p>}
    </div>,
  ];

  return (
    <div className="w-full max-w-[520px]">
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, position) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div className="h-0.5 overflow-hidden rounded-full bg-line">
              <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: position <= step ? "100%" : "0%" }} transition={spring} />
            </div>
            <span className={cn("text-[10px] tracking-wide uppercase", position === step ? "text-accent" : "text-faint")}>{label}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring}>
          {panels[step]}
        </motion.div>
      </AnimatePresence>

      {error && <p className="mt-4 text-xs text-danger">{error}</p>}

      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={busy}>
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
        ) : (
          <Link href="/login" className="text-xs text-mute hover:text-fg">
            I already have an account
          </Link>
        )}
        {step < STEPS.length - 1 ? (
          <Button variant="primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>
            Continue
            <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button variant="primary" disabled={!canContinue || busy} onClick={submit}>
            {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {busy ? "Creating your workspace" : "Create account"}
          </Button>
        )}
      </div>
    </div>
  );
}
