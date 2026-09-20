"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { useComments } from "@/lib/api";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { spring } from "../ui";

export function CommentRail({ editor, docId, column }: { editor: Editor; docId: string; column: RefObject<HTMLDivElement | null> }) {
  const anchors = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const found: [string, number][] = [];
      if (e.isDestroyed) return found;
      const seen = new Set<string>();
      e.state.doc.descendants((node, pos) => {
        for (const mark of node.marks) {
          if (mark.type.name === "comment" && !seen.has(mark.attrs.id)) {
            seen.add(mark.attrs.id);
            found.push([mark.attrs.id, pos]);
          }
        }
      });
      return found;
    },
  });
  const { data: comments } = useComments(docId);
  const focused = useUI((s) => s.focusCommentId);
  const [tops, setTops] = useState<{ id: string; top: number }[]>([]);

  useLayoutEffect(() => {
    const measure = () => {
      const base = column.current?.getBoundingClientRect().top;
      if (base === undefined || editor.isDestroyed) return;
      let last = -Infinity;
      setTops(
        anchors
          .map(([id, pos]) => ({ id, top: editor.view.coordsAtPos(pos).top - base - 2 }))
          .sort((a, b) => a.top - b.top)
          .map((t) => {
            last = Math.max(t.top, last + 30);
            return { id: t.id, top: last };
          }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (column.current) observer.observe(column.current);
    return () => observer.disconnect();
  }, [anchors, editor, column]);

  useEffect(() => {
    if (editor.isDestroyed) return;
    editor.view.dom.querySelectorAll<HTMLElement>(".comment-mark").forEach((el) => el.classList.toggle("is-focused", el.dataset.comment === focused));
  }, [focused, anchors, editor]);

  const byId = new Map(comments?.map((c) => [c.id, c]));

  return (
    <div className="pointer-events-none absolute inset-y-0 right-3 w-7">
      {tops.map(({ id, top }) => {
        const comment = byId.get(id);
        if (comment?.resolved) return null;
        return (
          <motion.button
            key={id}
            initial={{ scale: 0.5, opacity: 0, top }}
            animate={{ scale: 1, opacity: 1, top }}
            transition={spring}
            title={comment?.body || "Comment"}
            onClick={() => useUI.setState({ rightOpen: true, rightTab: "comments", focusCommentId: id })}
            className={cn(
              "pointer-events-auto absolute flex size-7 items-center justify-center rounded-full border border-line-strong bg-raised text-mute shadow-lg shadow-black/30 transition-colors hover:border-accent/60 hover:text-accent",
              focused === id && "border-accent/70 text-accent",
            )}
          >
            <MessageSquare className="size-3.5" />
            {comment?.body && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent" />}
          </motion.button>
        );
      })}
    </div>
  );
}
