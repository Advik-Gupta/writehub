"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { actions, useSettings, useSources } from "@/lib/api";
import { reference, renderSegs, STYLE_LABELS } from "@/lib/citations";
import { toast } from "@/lib/toast";
import type { Source, SourceInput, SourceKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, inputClass, Segmented } from "../ui";

const BLANK: SourceInput = { kind: "website", title: "", authors: "", container: "", publisher: "", date: "", url: "", pages: "", accessed: "", notes: "" };

export function SourceForm({ sourceId, attachTo, onClose }: { sourceId?: string; attachTo?: string; onClose: () => void }) {
  const { data: sources } = useSources();
  const existing = sourceId ? sources?.find((s) => s.id === sourceId) : undefined;
  if (sourceId && !existing) return null;
  return <SourceFields key={sourceId ?? "new"} existing={existing} attachTo={attachTo} onClose={onClose} />;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs text-mute">{label}</span>
      {children}
    </label>
  );
}

function SourceFields({ existing, attachTo, onClose }: { existing?: Source; attachTo?: string; onClose: () => void }) {
  const { data: settings } = useSettings();
  const style = settings?.citationStyle ?? "mla";
  const [form, setForm] = useState<SourceInput>(() => (existing ? { ...BLANK, ...existing } : BLANK));
  const [lookupUrl, setLookupUrl] = useState("");
  const [lookup, setLookup] = useState<"idle" | "loading" | "error">("idle");
  const [saving, setSaving] = useState(false);

  const bind = (key: keyof SourceInput) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const fetchMetadata = async () => {
    const raw = lookupUrl.trim();
    if (!raw) return;
    setLookup("loading");
    try {
      const meta = await actions.lookupSource(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
      setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(meta).filter(([, v]) => v)) }));
      setLookup("idle");
    } catch {
      setLookup("error");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const source = await actions.saveSource(form, existing?.id);
      if (attachTo && !existing) await actions.attachSource(attachTo, source.id, true);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save source");
      setSaving(false);
    }
  };

  const kind = form.kind;

  return (
    <div className="space-y-4">
      {!existing && (
        <div className="rounded-lg border border-line bg-bg/50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs text-dim">
            <Sparkles className="size-3.5 text-accent" />
            Paste a link to fill in the details
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={lookupUrl}
              onChange={(e) => setLookupUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMetadata()}
              placeholder="https://…"
              className={cn(inputClass, "font-mono text-xs")}
            />
            <Button onClick={fetchMetadata} disabled={lookup === "loading" || !lookupUrl.trim()} className="w-20">
              {lookup === "loading" ? <LoaderCircle className="size-3.5 animate-spin" /> : "Fetch"}
            </Button>
          </div>
          {lookup === "error" && <p className="mt-2 text-xs text-danger">Couldn&apos;t read that page. Fill in the details by hand.</p>}
        </div>
      )}

      <Segmented<SourceKind>
        layoutId="source-kind"
        value={kind}
        onChange={(v) => setForm((f) => ({ ...f, kind: v }))}
        options={[
          { value: "website", label: "Website" },
          { value: "article", label: "Article" },
          { value: "book", label: "Book" },
          { value: "person", label: "Person" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label={kind === "person" ? "Description" : "Title"} className="col-span-2">
          <input {...bind("title")} placeholder={kind === "person" ? "Personal interview" : ""} className={inputClass} />
        </Field>
        <Field label={kind === "person" ? "Name" : "Authors"} className="col-span-2">
          <input {...bind("authors")} placeholder="First Last; First Last" className={inputClass} />
        </Field>
        {(kind === "website" || kind === "article") && (
          <Field label={kind === "website" ? "Website" : "Journal or publication"}>
            <input {...bind("container")} className={inputClass} />
          </Field>
        )}
        {kind === "book" && (
          <Field label="Publisher">
            <input {...bind("publisher")} className={inputClass} />
          </Field>
        )}
        <Field label="Date">
          <input {...bind("date")} placeholder="2024 or 2024-05-12" className={inputClass} />
        </Field>
        {(kind === "article" || kind === "book") && (
          <Field label="Pages">
            <input {...bind("pages")} placeholder="12-34" className={inputClass} />
          </Field>
        )}
        {kind !== "person" && (
          <Field label="URL" className={kind === "book" ? "" : "col-span-2"}>
            <input {...bind("url")} className={cn(inputClass, "font-mono text-xs")} />
          </Field>
        )}
        {kind === "website" && (
          <Field label="Accessed">
            <input {...bind("accessed")} placeholder="2024-05-12" className={inputClass} />
          </Field>
        )}
        <Field label="Notes" className="col-span-2">
          <textarea {...bind("notes")} rows={2} className={cn(inputClass, "resize-none")} />
        </Field>
      </div>

      <div className="rounded-lg border border-line bg-bg/50 px-3 py-2.5">
        <p className="mb-1 text-[11px] tracking-wider text-mute uppercase">{STYLE_LABELS[style]} preview</p>
        <p className="text-[13px] leading-relaxed text-dim" dangerouslySetInnerHTML={{ __html: renderSegs(reference({ ...form, id: "", createdAt: 0 }, style), "html") }} />
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={saving || !(form.title || form.authors)}>
          {existing ? "Save changes" : attachTo ? "Add to essay" : "Add to library"}
        </Button>
      </div>
    </div>
  );
}
