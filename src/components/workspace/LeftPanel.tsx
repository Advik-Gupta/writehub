"use client";

import { AnimatePresence, motion } from "motion/react";
import { useUI } from "@/lib/store";
import { Binder } from "../binder/Binder";
import { OutlinePanel } from "../panels/OutlinePanel";
import { TagsPanel } from "../panels/TagsPanel";
import { spring } from "../ui";

export function LeftPanel() {
  const view = useUI((s) => s.leftView);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={view} className="h-full" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8, transition: { duration: 0.08 } }} transition={spring}>
        {view === "binder" ? <Binder /> : view === "outline" ? <OutlinePanel /> : <TagsPanel />}
      </motion.div>
    </AnimatePresence>
  );
}
