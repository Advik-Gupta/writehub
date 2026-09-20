"use client";

import { Plus, TextQuote } from "lucide-react";
import { useState } from "react";
import { useSettings, useSources } from "@/lib/api";
import { footnote, renderSegs } from "@/lib/citations";
import { insertCitation } from "@/lib/editorActions";
import { useActiveEditor, useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button, Empty, inputClass } from "../ui";

export function CiteForm({ sourceId: initial, onClose }: { sourceId?: string; onClose: () => void }) {
  const editor = useActiveEditor();
  const { data: sources = [] } = useSources();
  const { data: settings } = useSettings();
  const [sourceId, setSourceId] = useState<string | null>(initial ?? null);
  const [query, setQuery] = useState("");
  const [locator, setLocator] = useState("");
  const [quote, setQuote] = useState(() => {
    if (!editor) return "";
    const { from, to, empty } = editor.state.selection;
    return empty ? "" : editor.state.doc.textBetween(from, to, " ");
  });

  if (!editor) return <Empty icon={<TextQuote />} title="Open a document to cite into" />;

  const source = sources.find((s) => s.id === sourceId);

  if (!source) {
    const q = query.toLowerCase();
    const matches = sources.filter((s) => [s.title, s.authors, s.container].some((f) => f.toLowerCase().includes(q)));
    return (
      <div className="space-y-3">
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library" className={inputClass} />
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {matches.map((s) => (
            <button key={s.id} onClick={() => setSourceId(s.id)} className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left transition-colors hover:bg-hover">
              <span className="w-full truncate text-[13px] text-fg">{s.title || "Untitled"}</span>
              <span className="w-full truncate text-xs text-mute">{[s.authors, s.container].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
          {!matches.length && <p className="py-6 text-center text-xs text-mute">{sources.length ? "No matching sources." : "Your library is empty."}</p>}
        </div>
        <Button className="w-full" onClick={() => useUI.setState({ dialog: { type: "source" } })}>
          <Plus className="size-3.5" />
          Add a new source
        </Button>
      </div>
    );
  }

  const insert = () => {
    insertCitation(editor, { sourceId: source.id, quote: quote.trim(), locator: locator.trim() });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-line bg-bg/50 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-fg">{source.title}</p>
          <p className="truncate text-xs text-mute">{source.authors}</p>
        </div>
        <button onClick={() => setSourceId(null)} className="text-xs text-mute hover:text-accent">
          Change
        </button>
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs text-mute">Quote (optional)</span>
        <textarea autoFocus value={quote} onChange={(e) => setQuote(e.target.value)} rows={3} className={cn(inputClass, "resize-none leading-relaxed")} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs text-mute">Page or location</span>
        <input value={locator} onChange={(e) => setLocator(e.target.value)} onKeyDown={(e) => e.key === "Enter" && insert()} placeholder="42" className={inputClass} />
      </label>
      <div className="rounded-lg border border-line bg-bg/50 px-3 py-2.5 text-[13px] leading-relaxed text-dim">
        <sup className="mr-1.5 text-accent">n</sup>
        <span dangerouslySetInnerHTML={{ __html: renderSegs(footnote(source, settings?.citationStyle ?? "mla", quote.trim(), locator.trim()), "html") }} />
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={insert}>
          <TextQuote className="size-3.5" />
          Insert citation
        </Button>
      </div>
    </div>
  );
}
