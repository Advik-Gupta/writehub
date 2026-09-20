"use client";

import type { Editor } from "@tiptap/react";
import { AnimatePresence, motion } from "motion/react";
import { useSettings, useSources } from "@/lib/api";
import { footnote, renderSegs } from "@/lib/citations";
import { useCitations } from "@/lib/editorHooks";
import { spring } from "../ui";

export function Footnotes({ editor }: { editor: Editor }) {
  const citations = useCitations(editor);
  const { data: sources } = useSources();
  const { data: settings } = useSettings();
  const byId = new Map(sources?.map((s) => [s.id, s]));

  return (
    <AnimatePresence>
      {citations.length > 0 && (
        <motion.ol
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={spring}
          className="mt-16 space-y-1.5 border-t border-line pt-5"
        >
          {citations.map((c, i) => (
            <li
              key={i}
              onClick={() => editor.chain().focus().setNodeSelection(c.pos).scrollIntoView().run()}
              className="flex cursor-pointer gap-3 text-[13px] leading-relaxed text-mute transition-colors hover:text-dim"
            >
              <span className="w-4 shrink-0 pt-px text-right font-mono text-[11px] text-accent">{i + 1}</span>
              <span dangerouslySetInnerHTML={{ __html: renderSegs(footnote(byId.get(c.sourceId), settings?.citationStyle ?? "mla", c.quote, c.locator), "html") }} />
            </li>
          ))}
        </motion.ol>
      )}
    </AnimatePresence>
  );
}
