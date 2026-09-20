"use client";

import { ArrowUpRight, Check, Clipboard, Copy, FileCode, FileText, FileType, Globe, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { actions, useDoc } from "@/lib/api";
import { copyFormatted, exportDocument, publishShare } from "@/lib/exporting";
import { toast } from "@/lib/toast";
import { Button, spring } from "../ui";

export function ShareForm({ docId }: { docId: string }) {
  const { data: doc } = useDoc(docId);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!doc) return null;

  const url = doc.shareSlug ? `${window.location.origin}/s/${doc.shareSlug}` : null;

  const copyLink = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-[13px] font-medium">
          <Globe className="size-4 text-accent" />
          Public link
        </h3>
        <p className="mb-3 text-xs leading-relaxed text-mute">
          Everything else in your account is encrypted and unreadable to the server. A public link is the one exception: it saves a plain readable copy of this
          document so anyone with the link can open it. Republish to update it, or stop sharing to delete the copy.
        </p>
        <AnimatePresence mode="wait" initial={false}>
          {url ? (
            <motion.div key="on" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} className="space-y-2">
              <div className="flex gap-2">
                <input readOnly value={url} onFocus={(e) => e.target.select()} className="h-8 min-w-0 flex-1 rounded-md border border-line-strong bg-bg px-2.5 font-mono text-xs text-dim outline-none" />
                <Button onClick={copyLink} className="w-[84px]">
                  {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="ghost" onClick={() => window.open(url, "_blank", "noopener")}>
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" disabled={busy} onClick={() => run(async () => { await publishShare(docId); toast("Public copy updated"); })}>
                  Update public copy
                </Button>
                <button disabled={busy} onClick={() => run(() => actions.unshare(docId))} className="text-xs text-mute transition-colors hover:text-danger">
                  Stop sharing and delete the copy
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="off" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
              <Button variant="primary" disabled={busy} onClick={() => run(() => publishShare(docId))}>
                <Globe className="size-3.5" />
                Create public link
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="mb-1 flex items-center gap-2 text-[13px] font-medium">
          <Lock className="size-3.5 text-accent" />
          Export
        </h3>
        <p className="mb-3 text-xs text-mute">Exports are built on your device from the decrypted document. Nothing is uploaded.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => exportDocument(docId, "md")}>
            <FileText className="size-3.5" />
            Markdown
          </Button>
          <Button onClick={() => exportDocument(docId, "html")}>
            <FileCode className="size-3.5" />
            HTML
          </Button>
          <Button onClick={() => exportDocument(docId, "txt")}>
            <FileType className="size-3.5" />
            Plain text
          </Button>
          <Button onClick={() => copyFormatted(docId).then(() => toast("Copied with formatting"))}>
            <Clipboard className="size-3.5" />
            Copy formatted
          </Button>
        </div>
      </section>
    </div>
  );
}
