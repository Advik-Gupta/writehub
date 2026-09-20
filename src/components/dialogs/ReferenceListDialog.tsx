"use client";

import { Copy } from "lucide-react";
import { actions, useDocSources, useSettings, useSources } from "@/lib/api";
import { reference, referencesTitle, renderSegs, sortKey } from "@/lib/citations";
import { toast } from "@/lib/toast";
import type { CitationStyle, Source } from "@/lib/types";
import { Button, Segmented } from "../ui";

export function ReferenceList({ docId }: { docId: string }) {
  const { data: docSources = [] } = useDocSources(docId);
  const { data: sources = [] } = useSources();
  const { data: settings } = useSettings();
  const style = settings?.citationStyle ?? "mla";

  const list = docSources
    .map((ds) => sources.find((s) => s.id === ds.sourceId))
    .filter((s): s is Source => !!s)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  const copy = async () => {
    const heading = referencesTitle(style);
    const html = `<h2>${heading}</h2>${list.map((s) => `<p>${renderSegs(reference(s, style), "html")}</p>`).join("")}`;
    const text = `${heading}\n\n${list.map((s) => renderSegs(reference(s, style), "txt")).join("\n\n")}`;
    await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
    toast("Reference list copied");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-64">
          <Segmented<CitationStyle>
            layoutId="reference-list-style"
            value={style}
            onChange={(v) => actions.updateSettings({ citationStyle: v })}
            options={[
              { value: "mla", label: "MLA" },
              { value: "apa", label: "APA" },
              { value: "chicago", label: "Chicago" },
            ]}
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={copy} disabled={!list.length}>
          <Copy className="size-3.5" />
          Copy
        </Button>
      </div>
      <div className="rounded-lg border border-line bg-bg/50 px-6 py-5">
        <h2 className="mb-4 text-center font-mono text-sm font-semibold">{referencesTitle(style)}</h2>
        <div className="space-y-3">
          {list.map((s) => (
            <p key={s.id} className="pl-8 font-mono text-[13px] leading-relaxed -indent-8 text-dim" dangerouslySetInnerHTML={{ __html: renderSegs(reference(s, style), "html") }} />
          ))}
          {!list.length && <p className="text-center text-xs text-mute">No sources attached to this essay yet.</p>}
        </div>
      </div>
    </div>
  );
}
