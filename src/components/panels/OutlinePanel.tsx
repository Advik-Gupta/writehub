"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { ArrowRight, GripVertical, ListTree, Plus } from "lucide-react";
import { motion, Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { actions, useDoc } from "@/lib/api";
import { useHeadings } from "@/lib/editorHooks";
import { useActiveDocId, useActiveEditor } from "@/lib/store";
import type { DocRecord, Outline, OutlineTopic } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { Checkbox, Empty, IconButton, PanelHeader, PanelSection, softSpring, spring } from "../ui";

export function OutlinePanel() {
  const docId = useActiveDocId();
  const { data: doc } = useDoc(docId);
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Outline" />
      {doc ? (
        <OutlineBody key={doc.id} doc={doc} />
      ) : (
        <Empty icon={<ListTree />} title="No document open">
          Open a document to see its outline.
        </Empty>
      )}
    </div>
  );
}

function jumpTo(editor: Editor | undefined, pos: number) {
  if (!editor) return;
  editor.chain().focus().setTextSelection(pos + 1).run();
  (editor.view.nodeDOM(pos) as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function OutlineBody({ doc }: { doc: DocRecord }) {
  const editor = useActiveEditor();
  const headings = useHeadings(editor);
  const cursor = useEditorState({ editor: editor ?? null, selector: ({ editor: e }) => e?.state.selection.from ?? 0 }) ?? 0;
  const [outline, setOutline] = useState<Outline>(doc.outline);
  const [focusId, setFocusId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const commit = (next: Outline) => {
    setOutline(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => actions.updateNode(doc.id, { outline: next }), 400);
  };

  const topics = outline.topics;
  const setTopics = (next: OutlineTopic[]) => commit({ ...outline, topics: next });
  const toggleHeading = (key: string) =>
    commit({ ...outline, checked: outline.checked.includes(key) ? outline.checked.filter((k) => k !== key) : [...outline.checked, key] });

  const addTopic = (after?: number, depth = 0) => {
    const topic: OutlineTopic = { id: uid(), title: "", done: false, depth };
    const next = [...topics];
    next.splice(after === undefined ? next.length : after + 1, 0, topic);
    setTopics(next);
    setFocusId(topic.id);
  };

  const jumpToText = (title: string) => {
    if (!editor || !title.trim()) return;
    const needle = title.trim().toLowerCase();
    let found: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (found !== null) return false;
      if (node.isTextblock && node.textContent.toLowerCase().includes(needle)) {
        found = pos;
        return false;
      }
      return true;
    });
    if (found !== null) jumpTo(editor, found);
  };

  const activeHeading = headings.reduce((acc, h, i) => (h.pos <= cursor ? i : acc), -1);
  const total = headings.length + topics.length;
  const done = headings.filter((h) => outline.checked.includes(h.key)).length + topics.filter((t) => t.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-line px-4 py-3.5">
        <div className="flex justify-between text-xs text-mute">
          <span>
            {done} of {total} covered
          </span>
          <span className="font-mono">{percent}%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${percent}%` }} transition={softSpring} />
        </div>
      </div>

      <PanelSection title="Headings">
        {headings.length ? (
          <div className="space-y-px">
            {headings.map((h, i) => (
              <div
                key={`${h.pos}-${i}`}
                className={cn("group flex h-7 items-center gap-2 rounded-md pr-2 transition-colors hover:bg-hover", activeHeading === i && "bg-hover/60")}
                style={{ paddingLeft: 6 + (h.level - 1) * 14 }}
              >
                <Checkbox checked={outline.checked.includes(h.key)} onChange={() => toggleHeading(h.key)} />
                <button
                  onClick={() => jumpTo(editor, h.pos)}
                  className={cn(
                    "flex-1 truncate text-left text-[13px] transition-colors",
                    activeHeading === i ? "text-fg" : "text-dim group-hover:text-fg",
                    outline.checked.includes(h.key) && "text-mute line-through",
                    h.level === 1 && "font-medium",
                  )}
                >
                  {h.text || <span className="text-faint italic">Empty heading</span>}
                </button>
                {activeHeading === i && <motion.span layoutId="outline-cursor" className="size-1.5 rounded-full bg-accent" transition={spring} />}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-mute">Headings you write show up here. Type ## at the start of a line.</p>
        )}
      </PanelSection>

      <PanelSection
        title="Topics"
        action={
          <IconButton size="sm" label="Add topic" onClick={() => addTopic()}>
            <Plus />
          </IconButton>
        }
      >
        <Reorder.Group axis="y" values={topics} onReorder={setTopics} className="space-y-px">
          {topics.map((topic, i) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              autoFocus={focusId === topic.id}
              onChange={(patch) => setTopics(topics.map((t) => (t.id === topic.id ? { ...t, ...patch } : t)))}
              onEnter={() => addTopic(i, topic.depth)}
              onRemove={() => {
                setTopics(topics.filter((t) => t.id !== topic.id));
                setFocusId(topics[i - 1]?.id ?? null);
              }}
              onJump={() => jumpToText(topic.title)}
            />
          ))}
        </Reorder.Group>
        {!topics.length && (
          <button onClick={() => addTopic()} className="w-full rounded-md border border-dashed border-line-strong px-3 py-2.5 text-left text-xs text-mute transition-colors hover:border-faint hover:text-dim">
            Plan what to cover. Topics do not need to match headings.
          </button>
        )}
      </PanelSection>
    </div>
  );
}

function TopicItem({
  topic,
  autoFocus,
  onChange,
  onEnter,
  onRemove,
  onJump,
}: {
  topic: OutlineTopic;
  autoFocus: boolean;
  onChange: (patch: Partial<OutlineTopic>) => void;
  onEnter: () => void;
  onRemove: () => void;
  onJump: () => void;
}) {
  const controls = useDragControls();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  return (
    <Reorder.Item
      value={topic}
      dragListener={false}
      dragControls={controls}
      transition={spring}
      whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}
      className="group relative flex h-7 items-center gap-2 rounded-md bg-panel pr-1 hover:bg-hover"
      style={{ paddingLeft: topic.depth * 14 }}
    >
      <GripVertical onPointerDown={(e) => controls.start(e)} className="size-3 shrink-0 cursor-grab text-faint opacity-0 group-hover:opacity-100 active:cursor-grabbing" />
      <Checkbox checked={topic.done} onChange={(value) => onChange({ done: value })} />
      <input
        ref={input}
        value={topic.title}
        onChange={(e) => onChange({ title: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
          if (e.key === "Tab") {
            e.preventDefault();
            onChange({ depth: Math.max(0, Math.min(3, topic.depth + (e.shiftKey ? -1 : 1))) });
          }
          if (e.key === "Backspace" && !topic.title) {
            e.preventDefault();
            onRemove();
          }
        }}
        placeholder="New topic"
        className={cn("min-w-0 flex-1 bg-transparent text-[13px] text-dim outline-none placeholder:text-faint focus:text-fg", topic.done && "text-mute line-through")}
      />
      <IconButton size="sm" label="Find in document" className="opacity-0 group-hover:opacity-100" onClick={onJump}>
        <ArrowRight />
      </IconButton>
    </Reorder.Item>
  );
}
