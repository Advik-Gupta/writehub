"use client";

import { FileText } from "lucide-react";
import type { LinkRef } from "@/lib/types";
import { openLinkedDoc } from "./editor/extensions/wikiLink";

export function DocLink({ doc }: { doc: LinkRef }) {
  return (
    <button
      onClick={(e) => openLinkedDoc(doc.id, e.altKey)}
      title="Click to open · ⌥-click to open in the other pane"
      className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover"
    >
      <FileText className="size-3.5 shrink-0 text-mute transition-colors group-hover:text-accent" />
      <span className="flex-1 truncate text-[13px] text-dim group-hover:text-fg">{doc.title || "Untitled"}</span>
      <span className="max-w-24 truncate text-[11px] text-faint">{doc.projectTitle}</span>
    </button>
  );
}
