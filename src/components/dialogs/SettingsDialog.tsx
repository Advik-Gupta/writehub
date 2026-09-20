"use client";

import { Lock, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { actions, useSettings } from "@/lib/api";
import { lockNow } from "@/lib/session";
import { useUI, type EditorFont, type StatsMode } from "@/lib/store";
import type { CitationStyle } from "@/lib/types";
import { Button, inputClass, Kbd, Segmented, Switch } from "../ui";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-6 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-mute">{hint}</p>}
      </div>
      <div className="w-[240px] shrink-0">{children}</div>
    </div>
  );
}

const SHORTCUTS = [
  ["Search everything", "⌘P"],
  ["New document", "⌥⌘N"],
  ["Split view", "⌥⌘\\"],
  ["Corkboard", "⌥⌘G"],
  ["Link", "⌘K"],
  ["Comment", "⌥⌘M"],
  ["Find and replace", "⌘F"],
  ["Heading 1 to 3", "⌥⌘1-3"],
  ["Slash commands", "/"],
  ["Link a document", "[["],
];

const LOCK_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hour" },
  { value: 0, label: "Never" },
];

export function SettingsForm() {
  const { data: settings } = useSettings();
  const editorFont = useUI((state) => state.editorFont);
  const statsMode = useUI((state) => state.statsMode);
  const showToolbar = useUI((state) => state.showToolbar);
  const [author, setAuthor] = useState(settings?.author ?? "");

  return (
    <div>
      <div className="divide-y divide-line">
        <Row label="Author name" hint="Shown on documents and on anything you publish.">
          <input value={author} onChange={(event) => setAuthor(event.target.value)} onBlur={() => actions.updateSettings({ author: author.trim() })} className={inputClass} />
        </Row>
        <Row label="Citation style">
          <Segmented<CitationStyle>
            layoutId="settings-style"
            value={settings?.citationStyle ?? "mla"}
            onChange={(value) => actions.updateSettings({ citationStyle: value })}
            options={[
              { value: "mla", label: "MLA" },
              { value: "apa", label: "APA" },
              { value: "chicago", label: "Chicago" },
            ]}
          />
        </Row>
        <Row label="Editor font">
          <Segmented<EditorFont>
            layoutId="settings-font"
            value={editorFont}
            onChange={(value) => useUI.setState({ editorFont: value })}
            options={[
              { value: "mono", label: "Mono" },
              { value: "sans", label: "Sans" },
              { value: "serif", label: "Serif" },
            ]}
          />
        </Row>
        <Row label="Word count widget" hint="In the top bar.">
          <Segmented<StatsMode>
            layoutId="settings-stats"
            value={statsMode}
            onChange={(value) => useUI.setState({ statsMode: value })}
            options={[
              { value: "words", label: "Words" },
              { value: "full", label: "Full" },
              { value: "off", label: "Off" },
            ]}
          />
        </Row>
        <Row label="Formatting toolbar">
          <div className="flex justify-end">
            <Switch checked={showToolbar} onChange={(value) => useUI.setState({ showToolbar: value })} />
          </div>
        </Row>
        <Row label="Lock after idle" hint="Wipes the decryption key from memory until you unlock again.">
          <Segmented<number>
            layoutId="settings-lock"
            value={settings?.lockAfterMinutes ?? 15}
            onChange={(value) => actions.updateSettings({ lockAfterMinutes: value })}
            options={LOCK_OPTIONS}
          />
        </Row>
        <Row label="Account" hint="Email, password, app password and deleting your data.">
          <div className="flex justify-end gap-2">
            <Button onClick={() => lockNow()}>
              <Lock className="size-3.5" />
              Lock
            </Button>
            <Link href="/account">
              <Button>
                <UserRound className="size-3.5" />
                Open account
              </Button>
            </Link>
          </div>
        </Row>
      </div>
      <div className="mt-3 border-t border-line pt-4">
        <p className="mb-2 text-[11px] font-medium tracking-wider text-mute uppercase">Keyboard</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {SHORTCUTS.map(([label, keys]) => (
            <div key={label} className="flex items-center justify-between text-xs text-dim">
              {label}
              <Kbd>{keys}</Kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
