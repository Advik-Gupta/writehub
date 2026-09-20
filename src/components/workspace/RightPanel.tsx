"use client";

import { FileText, Info, Link2, MessageSquare, Target, TextQuote } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActiveDocId, useUI, type RightTab } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CommentsPanel } from "../panels/CommentsPanel";
import { InfoPanel } from "../panels/InfoPanel";
import { InsightsPanel } from "../panels/InsightsPanel";
import { LinksPanel } from "../panels/LinksPanel";
import { ReferencesPanel } from "../panels/ReferencesPanel";
import { Empty, spring, Tip } from "../ui";

const TABS: { id: RightTab; label: string; icon: typeof Target }[] = [
  { id: "insights", label: "Goals & insights", icon: Target },
  { id: "references", label: "References", icon: TextQuote },
  { id: "info", label: "Document info", icon: Info },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "links", label: "Links & tags", icon: Link2 },
];

export function RightPanel() {
  const tab = useUI((s) => s.rightTab);
  const docId = useActiveDocId();
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-line px-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Tip key={id} label={label}>
            <button
              aria-label={label}
              onClick={() => useUI.setState({ rightTab: id })}
              className={cn("relative flex size-8 items-center justify-center rounded-md transition-colors", tab === id ? "text-accent" : "text-mute hover:bg-hover hover:text-fg")}
            >
              {tab === id && <motion.span layoutId="right-tab" className="absolute inset-0 rounded-md bg-hover" transition={spring} />}
              <Icon className="relative size-4" />
            </button>
          </Tip>
        ))}
        <span className="ml-auto truncate pr-2 text-xs text-mute">{current.label}</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${tab}-${docId}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
            transition={spring}
            className="absolute inset-0"
          >
            {tab === "references" ? (
              <ReferencesPanel docId={docId} />
            ) : !docId ? (
              <Empty icon={<FileText />} title="No document open">
                Open a document to see its {current.label.toLowerCase()}.
              </Empty>
            ) : tab === "insights" ? (
              <InsightsPanel docId={docId} />
            ) : tab === "info" ? (
              <InfoPanel docId={docId} />
            ) : tab === "comments" ? (
              <CommentsPanel docId={docId} />
            ) : (
              <LinksPanel docId={docId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
