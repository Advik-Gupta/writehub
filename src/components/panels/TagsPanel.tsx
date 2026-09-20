"use client";

import { Hash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTagDocs, useTags } from "@/lib/api";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DocLink } from "../DocLink";
import { Empty, PanelHeader, PanelSection, spring } from "../ui";

export function TagsPanel() {
  const { data: tags } = useTags();
  const active = useUI((s) => s.activeTag);
  const { data: docs } = useTagDocs(active);

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Tags" />
      <div className="flex-1 overflow-y-auto">
        {!tags?.length ? (
          <Empty icon={<Hash />} title="No tags yet">
            Write #tags anywhere in a document to group ideas across projects.
          </Empty>
        ) : (
          <div className="flex flex-wrap gap-1.5 border-b border-line p-4">
            {tags.map((t, i) => (
              <motion.button
                key={t.tag}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring, delay: Math.min(i, 20) * 0.015 }}
                onClick={() => useUI.setState({ activeTag: active === t.tag ? null : t.tag })}
                className={cn(
                  "flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
                  active === t.tag ? "border-violet/50 bg-violet/15 text-violet" : "border-line-strong text-dim hover:border-faint hover:text-fg",
                )}
              >
                #{t.tag}
                <span className="font-mono text-[10px] text-mute">{t.count}</span>
              </motion.button>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait">
          {active && (
            <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={spring}>
              <PanelSection title={`#${active}`} className="border-b-0">
                <div className="-mx-2">{docs?.map((doc) => <DocLink key={doc.id} doc={doc} />)}</div>
                {docs && !docs.length && <p className="text-xs text-mute">No documents use this tag anymore.</p>}
              </PanelSection>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
