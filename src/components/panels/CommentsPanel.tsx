"use client";

import type { Editor } from "@tiptap/react";
import { Check, ChevronRight, MessageSquare, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { actions, useComments } from "@/lib/api";
import { removeCommentMark } from "@/lib/editorActions";
import { useActiveEditor, useUI } from "@/lib/store";
import type { Comment } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { Collapse, Empty, IconButton, Kbd, spring } from "../ui";

function markRange(editor: Editor, id: string) {
  let from = Infinity;
  let to = -Infinity;
  editor.state.doc.descendants((node, pos) => {
    if (node.marks.some((m) => m.type.name === "comment" && m.attrs.id === id)) {
      from = Math.min(from, pos);
      to = Math.max(to, pos + node.nodeSize);
    }
  });
  return from === Infinity ? null : { from, to };
}

export function CommentsPanel({ docId }: { docId: string }) {
  const { data: comments = [] } = useComments(docId);
  const editor = useActiveEditor();
  const focused = useUI((s) => s.focusCommentId);
  const [showResolved, setShowResolved] = useState(false);
  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <div className="h-full space-y-2.5 overflow-y-auto p-4">
      {!open.length && (
        <Empty icon={<MessageSquare />} title="No open comments">
          Select text and press <Kbd>⌥⌘M</Kbd> to leave a note in the margin.
        </Empty>
      )}
      <AnimatePresence initial={false}>
        {open.map((c) => (
          <CommentCard key={c.id} comment={c} docId={docId} editor={editor} focused={focused === c.id} />
        ))}
      </AnimatePresence>
      {resolved.length > 0 && (
        <div className="pt-2">
          <button onClick={() => setShowResolved((v) => !v)} className="flex items-center gap-1.5 text-xs text-mute hover:text-dim">
            <ChevronRight className={cn("size-3 transition-transform duration-200", showResolved && "rotate-90")} />
            Resolved ({resolved.length})
          </button>
          <Collapse open={showResolved}>
            <div className="space-y-2 pt-2.5">
              {resolved.map((c) => (
                <div key={c.id} className="group rounded-lg border border-line p-3 opacity-70">
                  <p className="line-clamp-1 text-xs text-mute italic">“{c.quote}”</p>
                  {c.body && <p className="mt-1 text-[13px] text-dim">{c.body}</p>}
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-faint">{relativeTime(c.createdAt)}</span>
                    <IconButton size="sm" label="Delete" onClick={() => deleteComment(docId, c.id, editor)}>
                      <Trash />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </Collapse>
        </div>
      )}
    </div>
  );
}

async function deleteComment(docId: string, id: string, editor: Editor | undefined) {
  if (editor && !editor.isDestroyed) removeCommentMark(editor, id);
  await actions.deleteComment(docId, id);
}

function CommentCard({ comment, docId, editor, focused }: { comment: Comment; docId: string; editor: Editor | undefined; focused: boolean }) {
  const [body, setBody] = useState(comment.body);
  const card = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (focused) card.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focused]);

  const save = (value: string) => {
    setBody(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => actions.updateComment(docId, comment.id, { body: value }), 400);
  };

  const reveal = () => {
    useUI.setState({ focusCommentId: comment.id });
    if (!editor || editor.isDestroyed) return;
    const range = markRange(editor, comment.id);
    if (range) editor.chain().setTextSelection(range).scrollIntoView().run();
  };

  const resolve = async () => {
    if (editor && !editor.isDestroyed) removeCommentMark(editor, comment.id);
    await actions.updateComment(docId, comment.id, { resolved: true, body });
  };

  return (
    <motion.div
      ref={card}
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.14 } }}
      transition={spring}
      onClick={reveal}
      className={cn("rounded-lg border p-3 transition-colors", focused ? "border-accent/50 bg-accent/[0.04]" : "border-line bg-bg/40 hover:border-line-strong")}
    >
      <blockquote className="mb-2 line-clamp-2 border-l-2 border-accent/50 pl-2 text-xs leading-relaxed text-mute">{comment.quote}</blockquote>
      <textarea
        value={body}
        autoFocus={focused && !comment.body}
        onChange={(e) => save(e.target.value)}
        placeholder="Add a note…"
        rows={2}
        className="field-sizing-content min-h-10 w-full resize-none bg-transparent text-[13px] leading-relaxed text-fg outline-none placeholder:text-faint"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-faint">{relativeTime(comment.createdAt)}</span>
        <div className="flex gap-0.5">
          <IconButton
            size="sm"
            label="Resolve"
            className="hover:text-accent"
            onClick={(e) => {
              e.stopPropagation();
              resolve();
            }}
          >
            <Check />
          </IconButton>
          <IconButton
            size="sm"
            label="Delete"
            className="hover:text-danger"
            onClick={(e) => {
              e.stopPropagation();
              deleteComment(docId, comment.id, editor);
            }}
          >
            <Trash />
          </IconButton>
        </div>
      </div>
    </motion.div>
  );
}
