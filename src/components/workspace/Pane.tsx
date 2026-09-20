"use client";

import { FilePlus, FileText, Feather, LayoutGrid, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useUI, type PaneContent } from "@/lib/store";
import { createDocument, useTreeIndex } from "@/lib/tree";
import { cn, relativeTime } from "@/lib/utils";
import { Corkboard } from "../corkboard/Corkboard";
import { DocumentPane } from "../editor/DocumentPane";
import { Button, IconButton, Kbd, spring } from "../ui";

export function Pane({ content, index }: { content: PaneContent; index: number }) {
  const split = useUI((s) => s.panes.length > 1);
  const active = useUI((s) => s.activePane === index);

  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.12 } }}
      transition={spring}
      onMouseDownCapture={() => !active && useUI.setState({ activePane: index })}
      className={cn("flex min-w-0 flex-1 flex-col", index > 0 && "border-l border-line")}
    >
      {split && <PaneHeader content={content} index={index} active={active} />}
      <div className="relative min-h-0 flex-1">
        {content?.kind === "doc" ? (
          <DocumentPane docId={content.id} pane={index} />
        ) : content?.kind === "board" ? (
          <Corkboard folderId={content.folderId} />
        ) : (
          <EmptyPane pane={index} />
        )}
      </div>
    </motion.section>
  );
}

function PaneHeader({ content, index, active }: { content: PaneContent; index: number; active: boolean }) {
  const tree = useTreeIndex();
  const closePane = useUI((s) => s.closePane);
  const id = content?.kind === "doc" ? content.id : content?.kind === "board" ? content.folderId : null;
  const title = id ? tree.byId.get(id)?.title || "Untitled" : "Empty pane";

  return (
    <div className={cn("flex h-8 shrink-0 items-center gap-2 border-b pr-1 pl-3 text-xs transition-colors duration-200", active ? "border-accent/25 bg-accent/[0.035] text-dim" : "border-line text-mute")}>
      <motion.span className="size-1.5 rounded-full" animate={{ backgroundColor: active ? "var(--color-accent)" : "var(--color-faint)", scale: active ? 1 : 0.8 }} transition={spring} />
      {content?.kind === "board" ? <LayoutGrid className="size-3" /> : <FileText className="size-3" />}
      <span className="flex-1 truncate">{title}</span>
      <IconButton size="sm" label="Close pane" onClick={() => closePane(index)}>
        <X />
      </IconButton>
    </div>
  );
}

function EmptyPane({ pane }: { pane: number }) {
  const tree = useTreeIndex();
  const openDoc = useUI((s) => s.openDoc);
  const recent = tree.recentDocs(6);

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="w-full max-w-[440px]">
        <Feather className="size-7 text-accent" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Start thinking.</h1>
        <p className="mt-1 text-[13px] text-mute">Pick something from the binder, or begin a fresh page.</p>
        <div className="mt-6 flex gap-2">
          <Button variant="primary" onClick={() => createDocument(undefined, pane)}>
            <FilePlus className="size-4" />
            New document
          </Button>
          <Button onClick={() => useUI.setState({ dialog: { type: "palette" } })}>
            <Search className="size-4" />
            Search
            <Kbd>⌘P</Kbd>
          </Button>
        </div>
        {recent.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-2 px-2 text-[11px] font-medium tracking-wider text-mute uppercase">Recent</h3>
            {recent.map((n, i) => (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.03 * i }}
                onClick={() => openDoc(n.id, pane)}
                className="group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-hover"
              >
                <FileText className="size-4 text-mute group-hover:text-accent" />
                <span className="flex-1 truncate text-[13px] text-dim group-hover:text-fg">{n.title || "Untitled"}</span>
                <span className="text-xs text-faint">{relativeTime(n.updatedAt)}</span>
              </motion.button>
            ))}
          </div>
        )}
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-2 px-2 text-xs text-mute">
          {[
            ["New document", "⌥⌘N"],
            ["Search everything", "⌘P"],
            ["Split view", "⌥⌘\\"],
            ["Corkboard", "⌥⌘G"],
            ["Toggle binder", "⌥⌘B"],
            ["Toggle inspector", "⌥⌘R"],
          ].map(([label, key]) => (
            <div key={label} className="flex items-center justify-between">
              {label}
              <Kbd>{key}</Kbd>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
