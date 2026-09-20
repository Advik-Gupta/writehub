"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useSettings } from "@/lib/api";
import { flushAllOnExit } from "@/lib/save";
import { lockNow } from "@/lib/session";
import { useUI } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { createDocument, lastDocByPane } from "@/lib/tree";
import { Dialogs } from "../dialogs/Dialogs";
import { spring } from "../ui";
import { IconRail, toggleCorkboard } from "./IconRail";
import { LeftPanel } from "./LeftPanel";
import { Pane } from "./Pane";
import { RightPanel } from "./RightPanel";
import { TopBar } from "./TopBar";

const LEFT_WIDTH = 272;
const RIGHT_WIDTH = 320;

function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const ui = useUI.getState();
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      if ((e.code === "KeyP" && !e.altKey && !e.shiftKey) || (e.code === "KeyF" && e.shiftKey)) run(() => ui.openDialog({ type: "palette" }));
      else if (e.altKey && e.code === "KeyB") run(() => useUI.setState((s) => ({ leftOpen: !s.leftOpen })));
      else if (e.altKey && e.code === "KeyR") run(() => useUI.setState((s) => ({ rightOpen: !s.rightOpen })));
      else if (e.altKey && e.code === "Backslash") run(ui.toggleSplit);
      else if (e.altKey && e.code === "KeyN") run(() => createDocument());
      else if (e.altKey && e.code === "KeyG") run(toggleCorkboard);
    };
    const onExit = () => flushAllOnExit();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pagehide", onExit);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pagehide", onExit);
    };
  }, []);
}

function useIdleLock() {
  const { data: settings } = useSettings();
  const minutes = settings?.lockAfterMinutes ?? 0;
  useEffect(() => {
    if (!minutes) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        flushAllOnExit();
        lockNow();
      }, minutes * 60_000);
    };
    const events = ["pointerdown", "keydown", "wheel", "focus"];
    events.forEach((event) => window.addEventListener(event, reset, true));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset, true));
    };
  }, [minutes]);
}

export function Workspace() {
  const leftOpen = useUI((s) => s.leftOpen);
  const rightOpen = useUI((s) => s.rightOpen);
  const panes = useUI((s) => s.panes);
  useGlobalShortcuts();
  useIdleLock();

  useEffect(() => {
    panes.forEach((p, i) => p?.kind === "doc" && lastDocByPane.set(i, p.id));
  }, [panes]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
      <IconRail />
      <motion.aside initial={false} animate={{ width: leftOpen ? LEFT_WIDTH : 0 }} transition={spring} className="shrink-0 overflow-hidden bg-panel">
        <div className="h-full border-r border-line" style={{ width: LEFT_WIDTH }}>
          <LeftPanel />
        </div>
      </motion.aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <AnimatePresence initial={false}>
            {panes.map((content, index) => (
              <Pane key={index} content={content} index={index} />
            ))}
          </AnimatePresence>
        </div>
      </main>
      <motion.aside initial={false} animate={{ width: rightOpen ? RIGHT_WIDTH : 0 }} transition={spring} className="shrink-0 overflow-hidden bg-panel">
        <div className="h-full border-l border-line" style={{ width: RIGHT_WIDTH }}>
          <RightPanel />
        </div>
      </motion.aside>
      <Dialogs />
      <Toaster />
    </div>
  );
}

function Toaster() {
  const { message, id } = useToast();
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={spring}
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg border border-line-strong bg-raised px-3.5 py-2 text-[13px] text-fg shadow-2xl shadow-black/50"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
