"use client";

import { ArrowLeft, Check, LoaderCircle, Lock, LogOut, ShieldCheck, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { actions, useSettings } from "@/lib/api";
import { APP_NAME } from "@/lib/config";
import { changePassword, deleteAccount, lockNow, setAppPassword, signOut, updateEmail, updateProfile, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { type Profile } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { PrivacyNotes } from "../auth/PrivacyNotes";
import { Button, inputClass, Segmented, spring } from "../ui";
import { motion } from "motion/react";

const LOCK_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hour" },
  { value: 0, label: "Never" },
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-7">
      <h2 className="text-[13px] font-semibold">{title}</h2>
      {description && <p className="mt-1 mb-4 max-w-lg text-xs leading-relaxed text-mute">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-6 py-2.5">
      <span className="w-[150px] shrink-0 text-xs text-mute">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AccountPage() {
  const router = useRouter();
  const session = useSession();
  const { data: settings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(session.profile);
  const [email, setEmail] = useState(session.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [appPassword, setAppPasswordValue] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (session.profile) setProfile(session.profile);
  }, [session.profile]);

  useEffect(() => {
    if (session.status === "signedOut") router.replace("/login");
  }, [session.status, router]);

  const run = async (task: string, action: () => Promise<unknown>, done: string) => {
    setBusy(task);
    try {
      await action();
      toast(done);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  if (!profile) return <div className="h-screen bg-bg" />;

  return (
    <div className="h-screen overflow-y-auto bg-bg text-fg">
      <div className="mx-auto max-w-[680px] px-8 pt-10 pb-24">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-mute transition-colors hover:text-fg">
          <ArrowLeft className="size-3.5" />
          Back to writing
        </Link>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-[13px] text-mute">
          {session.email} · joined {session.createdAt ? formatDate(session.createdAt) : ""}
        </p>

        <Section title="About you" description="Your name appears as the author on documents and on anything you publish. These answers are stored encrypted.">
          <Row label="Name">
            <input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className={inputClass} />
          </Row>
          <Row label="Focus">
            <input value={profile.focus} onChange={(event) => setProfile({ ...profile, focus: event.target.value })} placeholder="What you are working towards" className={inputClass} />
          </Row>
          <Row label="Why you write">
            <input value={profile.purpose} onChange={(event) => setProfile({ ...profile, purpose: event.target.value })} className={inputClass} />
          </Row>
          <Row label="What you write">
            <input
              value={profile.writing.join(", ")}
              onChange={(event) => setProfile({ ...profile, writing: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean) })}
              className={inputClass}
            />
          </Row>
          <Row label="How often">
            <input value={profile.cadence} onChange={(event) => setProfile({ ...profile, cadence: event.target.value })} className={inputClass} />
          </Row>
          <div className="mt-3">
            <Button
              variant="primary"
              disabled={busy === "profile"}
              onClick={() =>
                run(
                  "profile",
                  async () => {
                    await updateProfile(profile);
                    await actions.updateSettings({ author: profile.name.trim() });
                  },
                  "Profile saved",
                )
              }
            >
              {busy === "profile" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Save profile
            </Button>
          </div>
        </Section>

        <Section title="Email" description="Changing the email that signs you in. Confirm with your account password.">
          <Row label="Email">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          </Row>
          <Row label="Account password">
            <input type="password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} className={inputClass} />
          </Row>
          <div className="mt-3">
            <Button
              disabled={busy === "email" || !emailPassword || email === session.email}
              onClick={() =>
                run(
                  "email",
                  async () => {
                    await updateEmail(emailPassword, email);
                    setEmailPassword("");
                  },
                  "Email updated",
                )
              }
            >
              Update email
            </Button>
          </div>
        </Section>

        <Section
          title="Account password"
          description="This password derives the key to your writing. Changing it re-wraps that key on this device, so pick something you will remember. Nobody can reset it for you."
        >
          <Row label="Current password">
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} />
          </Row>
          <Row label="New password">
            <input type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} className={inputClass} />
          </Row>
          <div className="mt-3">
            <Button
              disabled={busy === "password" || !currentPassword || nextPassword.length < 10}
              onClick={() =>
                run(
                  "password",
                  async () => {
                    await changePassword(currentPassword, nextPassword);
                    setCurrentPassword("");
                    setNextPassword("");
                  },
                  "Password changed. Any app password was cleared.",
                )
              }
            >
              Change password
            </Button>
          </div>
        </Section>

        <Section
          title="App password and auto lock"
          description={`A short app password locks ${APP_NAME} without signing you out. When the workspace locks, the key is wiped from memory and your writing is unreadable until you unlock it.`}
        >
          <Row label="Lock after">
            <div className="max-w-[320px]">
              <Segmented<number>
                layoutId="lock-after"
                value={settings?.lockAfterMinutes ?? 15}
                onChange={(value) => actions.updateSettings({ lockAfterMinutes: value })}
                options={LOCK_OPTIONS}
              />
            </div>
          </Row>
          <Row label={session.appLock ? "Change app password" : "Set app password"}>
            <input type="password" value={appPassword} onChange={(event) => setAppPasswordValue(event.target.value)} placeholder="App password" className={inputClass} />
          </Row>
          <div className="mt-3 flex gap-2">
            <Button
              disabled={busy === "applock" || appPassword.length < 4}
              onClick={() =>
                run(
                  "applock",
                  async () => {
                    await setAppPassword(appPassword);
                    setAppPasswordValue("");
                  },
                  "App password set",
                )
              }
            >
              <ShieldCheck className="size-3.5" />
              {session.appLock ? "Update app password" : "Set app password"}
            </Button>
            {session.appLock && (
              <Button variant="ghost" disabled={busy === "applock"} onClick={() => run("applock", () => setAppPassword(null), "App password removed")}>
                Remove
              </Button>
            )}
            <Button variant="ghost" onClick={() => lockNow()}>
              <Lock className="size-3.5" />
              Lock now
            </Button>
          </div>
        </Section>

        <Section title="How your data is stored">
          <PrivacyNotes compact />
        </Section>

        <Section
          title="Delete account"
          description="This removes every project, document, source, comment and image belonging to this account from the database, along with the account itself. There are no backups and no copies kept. It cannot be undone."
        >
          <Row label="Account password">
            <input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className={inputClass} />
          </Row>
          <Row label="Type DELETE">
            <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className={cn(inputClass, "font-mono")} />
          </Row>
          <div className="mt-3">
            <Button
              variant="danger"
              disabled={busy === "delete" || deleteConfirm !== "DELETE" || !deletePassword}
              onClick={() => run("delete", () => deleteAccount(deletePassword), "Account deleted")}
            >
              <Trash className="size-3.5" />
              Delete everything permanently
            </Button>
          </div>
        </Section>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={spring} className="pt-7">
          <Button variant="ghost" onClick={() => signOut()}>
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
