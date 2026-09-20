"use client";

import { BookOpen, Folder, Hash, LayoutGrid, ListTree, Lock, MessageSquare, Search, Settings, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { keys } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useUI, type LeftView } from "@/lib/store";
import type { Tree } from "@/lib/types";
import { buildIndex, currentFolderId, lastDocByPane } from "@/lib/tree";
import { lockNow } from "@/lib/session";
import { IconButton, spring } from "../ui";

export function toggleCorkboard() {
  const ui = useUI.getState();
  const pane = ui.panes[ui.activePane];
  if (pane?.kind === "board") {
    const last = lastDocByPane.get(ui.activePane);
    if (last) ui.openDoc(last);
    return;
  }
  const index = buildIndex(queryClient.getQueryData<Tree>(keys.tree));
  const folder = pane?.kind === "doc" ? index.byId.get(pane.id)?.parentId : currentFolderId();
  if (folder) ui.openBoard(folder);
}

function RailButton({ label, shortcut, active, onClick, children }: { label: string; shortcut?: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <div className="relative">
      <AnimatePresence>
        {active && (
          <motion.span
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={spring}
            className="absolute top-1.5 -left-[10px] h-5 w-[3px] rounded-r-full bg-accent"
          />
        )}
      </AnimatePresence>
      <IconButton label={label} shortcut={shortcut} side="right" active={active} onClick={onClick} className="size-9 [&_svg]:size-[18px]">
        {children}
      </IconButton>
    </div>
  );
}

export function IconRail() {
  const leftOpen = useUI((s) => s.leftOpen);
  const leftView = useUI((s) => s.leftView);
  const showLeft = useUI((s) => s.showLeft);
  const showRight = useUI((s) => s.showRight);
  const commentsOpen = useUI((s) => s.rightOpen && s.rightTab === "comments");
  const boardActive = useUI((s) => s.panes[s.activePane]?.kind === "board");
  const openDialog = useUI((s) => s.openDialog);

  const views: [LeftView, string, string, ReactNode][] = [
    ["binder", "Binder", "⌥⌘B", <Folder key="b" />],
    ["outline", "Outline", "", <ListTree key="o" />],
    ["tags", "Tags", "", <Hash key="t" />],
  ];

  return (
    <nav className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-line bg-bg py-2.5">
      <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-accent/15 font-mono text-sm font-bold text-accent">d</div>
      {views.map(([view, label, shortcut, icon]) => (
        <RailButton key={view} label={label} shortcut={shortcut || undefined} active={leftOpen && leftView === view} onClick={() => showLeft(view)}>
          {icon}
        </RailButton>
      ))}
      <div className="my-1.5 h-px w-5 bg-line-strong" />
      <RailButton label="Corkboard" shortcut="⌥⌘G" active={boardActive} onClick={toggleCorkboard}>
        <LayoutGrid />
      </RailButton>
      <RailButton label="Comments" active={commentsOpen} onClick={() => showRight("comments")}>
        <MessageSquare />
      </RailButton>
      <RailButton label="Search" shortcut="⌘P" onClick={() => openDialog({ type: "palette" })}>
        <Search />
      </RailButton>
      <div className="flex-1" />
      <RailButton label="Compile" onClick={() => openDialog({ type: "compile" })}>
        <BookOpen />
      </RailButton>
      <RailButton label="Lock workspace" onClick={() => lockNow()}>
        <Lock />
      </RailButton>
      <RailButton label="Account" onClick={() => { window.location.href = "/account"; }}>
        <UserRound />
      </RailButton>
      <RailButton label="Settings" onClick={() => openDialog({ type: "settings" })}>
        <Settings />
      </RailButton>
    </nav>
  );
}
