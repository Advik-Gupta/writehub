"use client";

import { Link2 } from "lucide-react";
import { useLinks } from "@/lib/api";
import { useUI } from "@/lib/store";
import { DocLink } from "../DocLink";
import { Kbd, PanelSection } from "../ui";

export function LinksPanel({ docId }: { docId: string }) {
  const { data } = useLinks(docId);
  if (!data) return null;

  return (
    <div className="h-full overflow-y-auto">
      <PanelSection title={`Backlinks · ${data.backlinks.length}`}>
        {data.backlinks.length ? (
          <div className="-mx-2">{data.backlinks.map((doc) => <DocLink key={doc.id} doc={doc} />)}</div>
        ) : (
          <p className="text-xs leading-relaxed text-mute">No documents link here yet.</p>
        )}
      </PanelSection>
      <PanelSection title={`Links out · ${data.outgoing.length}`}>
        {data.outgoing.length ? (
          <div className="-mx-2">{data.outgoing.map((doc) => <DocLink key={doc.id} doc={doc} />)}</div>
        ) : (
          <p className="flex flex-wrap items-center gap-1 text-xs leading-relaxed text-mute">
            <Link2 className="size-3" /> Type <Kbd>[[</Kbd> to link another document.
          </p>
        )}
      </PanelSection>
      <PanelSection title="Tags" className="border-b-0">
        {data.tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => useUI.setState({ activeTag: tag, leftOpen: true, leftView: "tags" })}
                className="h-6 rounded-full border border-violet/40 bg-violet/10 px-2.5 text-xs text-violet transition-colors hover:bg-violet/20"
              >
                #{tag}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-mute">Write #tags in the text to tag this document.</p>
        )}
      </PanelSection>
    </div>
  );
}
