"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { FileX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { actions, useDoc } from "@/lib/api";
import { insertImageFiles } from "@/lib/editorActions";
import { useEditorBinding } from "@/lib/editorHooks";
import { liveContent, scheduleSave, SYNC_META } from "@/lib/save";
import { useUI } from "@/lib/store";
import type { DocRecord } from "@/lib/types";
import { Empty, spring } from "../ui";
import { CommentRail } from "./CommentRail";
import { buildExtensions } from "./extensions";
import { FindBar } from "./FindBar";
import { Footnotes } from "./Footnotes";
import { LinkEditor, LinkHover } from "./LinkPopovers";
import { Toolbar } from "./Toolbar";

export function DocumentPane({ docId, pane }: { docId: string; pane: number }) {
  const { data: doc, isError } = useDoc(docId);
  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty icon={<FileX />} title="This document no longer exists" />
      </div>
    );
  }
  if (!doc) return <div className="h-full" />;
  return <LoadedDocument key={doc.id} doc={doc} pane={pane} />;
}

function LoadedDocument({ doc, pane }: { doc: DocRecord; pane: number }) {
  const [extensions] = useState(buildExtensions);
  const editor = useEditor({
    extensions,
    content: liveContent(doc.id) ?? doc.content ?? "",
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: "prose-doc min-h-[40vh]", spellcheck: "true" },
      handlePaste: (view, event) => insertImageFiles(view, [...(event.clipboardData?.files ?? [])]),
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        return insertImageFiles(view, [...(event.dataTransfer?.files ?? [])], view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
      },
    },
    onUpdate: ({ transaction }) => {
      if (!transaction.getMeta(SYNC_META)) scheduleSave(doc.id);
    },
  });
  useEditorBinding(doc.id, pane, editor);

  const showToolbar = useUI((s) => s.showToolbar);
  const font = useUI((s) => s.editorFont);
  const findOpen = useUI((s) => !!s.findOpen[pane]);
  const column = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex h-full min-w-0 flex-col">
      <AnimatePresence initial={false}>
        {showToolbar && editor && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
            <Toolbar editor={editor} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{findOpen && editor && <FindBar editor={editor} pane={pane} />}</AnimatePresence>
      <div className="flex-1 overflow-y-auto" data-font={font}>
        <div ref={column} className="relative mx-auto max-w-[780px] px-16 pt-14 pb-[40vh]">
          <TitleField doc={doc} editor={editor} />
          <EditorContent editor={editor} />
          {editor && <Footnotes editor={editor} />}
          {editor && <CommentRail editor={editor} docId={doc.id} column={column} />}
        </div>
      </div>
      {editor && (
        <>
          <LinkEditor editor={editor} pane={pane} />
          <LinkHover editor={editor} pane={pane} />
        </>
      )}
    </div>
  );
}

function TitleField({ doc, editor }: { doc: DocRecord; editor: Editor | null }) {
  const [title, setTitle] = useState(doc.title);
  const field = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useLayoutEffect(() => {
    const el = field.current!;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    if (document.activeElement !== field.current) setTitle(doc.title);
  }, [doc.title]);

  useEffect(() => {
    if (!doc.title && !doc.content) field.current?.focus();
  }, [doc.title, doc.content]);

  return (
    <textarea
      ref={field}
      rows={1}
      value={title}
      placeholder="Untitled"
      onChange={(e) => {
        const value = e.target.value.replace(/\n/g, "");
        setTitle(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => actions.updateNode(doc.id, { title: value }), 350);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "ArrowDown") {
          e.preventDefault();
          editor?.commands.focus("start");
        }
      }}
      className="mb-7 block w-full resize-none overflow-hidden bg-transparent text-[2.1em] leading-[1.2] font-semibold tracking-tight text-fg outline-none placeholder:text-faint"
      style={{ fontFamily: "var(--doc-font, var(--font-mono))" }}
    />
  );
}
