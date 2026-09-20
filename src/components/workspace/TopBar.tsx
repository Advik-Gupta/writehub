"use client";

import { Check, ChevronRight, CircleAlert, Clipboard, Columns2, Download, FileCode, FileText, FileType, LoaderCircle, PanelLeft, PanelRight, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { Fragment } from "react";
import { useDoc } from "@/lib/api";
import { copyFormatted, exportDocument } from "@/lib/exporting";
import { useDocStats } from "@/lib/editorHooks";
import { useActiveEditor, useActivePane, useUI, type SaveState } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useTreeIndex } from "@/lib/tree";
import { cn } from "@/lib/utils";
import { IconButton, menuContentClass, menuItemClass, menuSeparatorClass, ProgressRing, spring } from "../ui";

export function TopBar() {
  const pane = useActivePane();
  const index = useTreeIndex();
  const editor = useActiveEditor();
  const stats = useDocStats(editor);
  const statsMode = useUI((s) => s.statsMode);
  const split = useUI((s) => s.panes.length > 1);
  const rightOpen = useUI((s) => s.rightOpen);
  const leftOpen = useUI((s) => s.leftOpen);
  const toggleSplit = useUI((s) => s.toggleSplit);
  const openBoard = useUI((s) => s.openBoard);
  const openDialog = useUI((s) => s.openDialog);

  const docId = pane?.kind === "doc" ? pane.id : null;
  const { data: doc } = useDoc(docId);
  const saveState = useUI((s) => (docId ? s.saveState[docId] : undefined));

  const nodeId = pane?.kind === "doc" ? pane.id : pane?.kind === "board" ? pane.folderId : null;
  const node = nodeId ? index.byId.get(nodeId) : undefined;
  const crumbs = node ? [...index.ancestors(node.id), node] : [];
  const project = node ? index.project(node.projectId) : undefined;

  const words = stats?.words ?? doc?.wordCount ?? 0;
  const goal = doc?.wordGoal ?? null;

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-2">
      <IconButton label={leftOpen ? "Hide sidebar" : "Show sidebar"} shortcut="⌥⌘B" onClick={() => useUI.setState({ leftOpen: !leftOpen })}>
        <PanelLeft />
      </IconButton>
      <nav className="flex min-w-0 flex-1 items-center gap-0.5 pl-1 text-[13px]">
        {project && <span className="shrink-0 truncate px-1 text-mute">{project.title}</span>}
        {crumbs.map((c, i) => (
          <Fragment key={c.id}>
            <ChevronRight className="size-3 shrink-0 text-faint" />
            <button
              onClick={() => c.kind === "folder" && c.role !== "trash" && openBoard(c.id)}
              className={cn("truncate rounded px-1.5 py-0.5 transition-colors", i === crumbs.length - 1 ? "text-fg" : "text-mute hover:bg-hover hover:text-dim")}
            >
              {c.title || "Untitled"}
            </button>
          </Fragment>
        ))}
      </nav>

      {docId && <SaveIndicator state={saveState} />}

      {docId && statsMode !== "off" && (
        <button
          onClick={() => useUI.setState({ rightOpen: true, rightTab: "insights" })}
          className="flex h-8 items-center gap-2 rounded-md px-2 transition-colors hover:bg-hover"
        >
          {statsMode === "full" && (
            <>
              <ProgressRing value={goal ? words / goal : 0} size={20} stroke={2.5} />
              {goal && <span className="font-mono text-xs text-dim tabular-nums">{Math.round((words / goal) * 100)}%</span>}
            </>
          )}
          <span className="font-mono text-xs text-mute tabular-nums">{words.toLocaleString()} words</span>
        </button>
      )}

      <div className="mx-1 h-4 w-px bg-line-strong" />
      <IconButton label={split ? "Close split view" : "Split view"} shortcut="⌥⌘\" active={split} onClick={toggleSplit}>
        <Columns2 />
      </IconButton>
      {docId && (
        <IconButton label="Share" onClick={() => openDialog({ type: "share", docId })}>
          <Share2 />
        </IconButton>
      )}
      {docId && <ExportMenu docId={docId} />}
      <IconButton label={rightOpen ? "Hide inspector" : "Show inspector"} shortcut="⌥⌘R" onClick={() => useUI.setState({ rightOpen: !rightOpen })}>
        <PanelRight />
      </IconButton>
    </header>
  );
}

function SaveIndicator({ state = "saved" }: { state?: SaveState }) {
  const content = {
    dirty: [<span key="d" className="size-1.5 rounded-full bg-mute" />, "Edited"],
    saving: [<LoaderCircle key="s" className="size-3 animate-spin" />, "Saving"],
    saved: [<Check key="c" className="size-3 text-accent" />, "Saved"],
    error: [<CircleAlert key="e" className="size-3 text-danger" />, "Save failed"],
  }[state];

  return (
    <div className="flex h-8 w-[84px] items-center justify-end overflow-hidden pr-1 text-xs text-mute">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring}
          className={cn("flex items-center gap-1.5", state === "error" && "text-danger")}
        >
          {content[0]}
          {content[1]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function ExportMenu({ docId }: { docId: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton label="Export">
          <Download />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuContentClass}>
          <DropdownMenu.Item className={menuItemClass} onSelect={() => exportDocument(docId, "md")}>
            <FileText />
            Markdown
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItemClass} onSelect={() => exportDocument(docId, "html")}>
            <FileCode />
            HTML
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItemClass} onSelect={() => exportDocument(docId, "txt")}>
            <FileType />
            Plain text
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={menuSeparatorClass} />
          <DropdownMenu.Item className={menuItemClass} onSelect={() => copyFormatted(docId).then(() => toast("Copied with formatting"))}>
            <Clipboard />
            Copy formatted
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
