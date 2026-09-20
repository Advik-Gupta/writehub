"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { CaseSensitive, ChevronDown, ChevronUp, Replace, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { findStep, getFindState, replaceAll, replaceCurrent, setFind } from "./extensions/findReplace";
import { Button, IconButton, spring } from "../ui";

export function FindBar({ editor, pane }: { editor: Editor; pane: number }) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(false);

  const { count, index } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const state = getFindState(e.state);
      return { count: state.matches.length, index: state.index };
    },
  });

  useEffect(() => {
    if (!editor.isDestroyed) setFind(editor, { query, caseSensitive });
  }, [editor, query, caseSensitive]);

  useEffect(
    () => () => {
      if (!editor.isDestroyed) setFind(editor, { query: "" });
    },
    [editor],
  );

  const close = () => {
    useUI.setState((s) => ({ findOpen: { ...s.findOpen, [pane]: false } }));
    editor.commands.focus();
  };

  const onKey = (e: React.KeyboardEvent, onEnter: () => void) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}
      transition={spring}
      className="absolute top-12 right-5 z-20 w-[340px] rounded-lg border border-line-strong bg-raised/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur"
    >
      <div className="flex items-center gap-1">
        <IconButton size="sm" label="Toggle replace" active={showReplace} onClick={() => setShowReplace((v) => !v)}>
          <Replace />
        </IconButton>
        <div className="relative flex-1">
          <input
            autoFocus
            data-find-input={pane}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => onKey(e, () => findStep(editor, e.shiftKey ? -1 : 1))}
            placeholder="Find"
            className="h-7 w-full rounded-md border border-line-strong bg-bg pr-14 pl-2 text-[13px] outline-none focus:border-accent/60"
          />
          <span className={cn("absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[11px]", query && !count ? "text-danger" : "text-mute")}>
            {query ? `${count ? index + 1 : 0}/${count}` : ""}
          </span>
        </div>
        <IconButton size="sm" label="Match case" active={caseSensitive} onClick={() => setCaseSensitive((v) => !v)}>
          <CaseSensitive />
        </IconButton>
        <IconButton size="sm" label="Previous" shortcut="⇧↵" disabled={!count} onClick={() => findStep(editor, -1)}>
          <ChevronUp />
        </IconButton>
        <IconButton size="sm" label="Next" shortcut="↵" disabled={!count} onClick={() => findStep(editor, 1)}>
          <ChevronDown />
        </IconButton>
        <IconButton size="sm" label="Close" shortcut="Esc" onClick={close}>
          <X />
        </IconButton>
      </div>
      {showReplace && (
        <div className="mt-1.5 flex items-center gap-1 pl-7">
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => onKey(e, () => replaceCurrent(editor, replacement))}
            placeholder="Replace with"
            className="h-7 min-w-0 flex-1 rounded-md border border-line-strong bg-bg px-2 text-[13px] outline-none focus:border-accent/60"
          />
          <Button size="sm" variant="ghost" disabled={!count} onClick={() => replaceCurrent(editor, replacement)}>
            Replace
          </Button>
          <Button size="sm" variant="ghost" disabled={!count} onClick={() => replaceAll(editor, replacement)}>
            All
          </Button>
        </div>
      )}
    </motion.div>
  );
}
