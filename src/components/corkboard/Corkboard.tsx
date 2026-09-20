"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpRight, BookOpen, FilePlus, Folder, FolderPlus, LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { actions } from "@/lib/api";
import { useUI } from "@/lib/store";
import { createDocument, createFolder, useTreeIndex } from "@/lib/tree";
import { STATUS_LABELS, type TreeNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "../StatusDot";
import { Button, Empty, IconButton, spring } from "../ui";

export function Corkboard({ folderId }: { folderId: string }) {
  const index = useTreeIndex();
  const folder = index.byId.get(folderId);
  const items = index.childrenOf(folderId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  if (!folder) return <Empty icon={<LayoutGrid />} title="This folder no longer exists" />;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    actions.moveNode(String(active.id), folderId, items.findIndex((i) => i.id === over.id));
  };

  const activeNode = activeId ? index.byId.get(activeId) : undefined;
  const trashed = index.isTrashed(folderId);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-6">
        <LayoutGrid className="size-4 text-accent" />
        <h2 className="truncate text-[13px] font-medium">{folder.title}</h2>
        <span className="font-mono text-xs text-mute">{items.length} cards</span>
        <div className="flex-1" />
        {!trashed && (
          <>
            <Button size="sm" variant="ghost" onClick={() => createFolder(folderId)}>
              <FolderPlus className="size-3.5" />
              Folder
            </Button>
            <Button size="sm" variant="ghost" onClick={async () => { const node = await actions.createNode(folderId, "document", ""); useUI.getState().openDoc(node.id); }}>
              <FilePlus className="size-3.5" />
              Card
            </Button>
            <Button size="sm" onClick={() => useUI.setState({ dialog: { type: "compile", folderId } })}>
              <BookOpen className="size-3.5" />
              Compile
            </Button>
          </>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-8">
        {!items.length ? (
          <Empty icon={<LayoutGrid />} title="An empty board">
            <div className="mt-3">
              <Button size="sm" variant="primary" onClick={() => createDocument(folderId)}>
                <FilePlus className="size-3.5" />
                New card
              </Button>
            </div>
          </Empty>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-5">
                {items.map((node, i) => (
                  <SortableCard key={node.id} node={node} number={i + 1} childCount={index.childrenOf(node.id).length} />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 240, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.15)" }}>
              {activeNode && <CardFace node={activeNode} number={items.findIndex((i) => i.id === activeNode.id) + 1} childCount={index.childrenOf(activeNode.id).length} overlay />}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function SortableCard({ node, number, childCount }: { node: TreeNode; number: number; childCount: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("transition-opacity", isDragging && "opacity-25")}>
      <CardFace node={node} number={number} childCount={childCount} handle={{ ...attributes, ...listeners }} />
    </div>
  );
}

function CardFace({ node, number, childCount, handle, overlay }: { node: TreeNode; number: number; childCount: number; handle?: HTMLAttributes<HTMLDivElement>; overlay?: boolean }) {
  const [synopsis, setSynopsis] = useState(node.synopsis);
  const field = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFolder = node.kind === "folder";

  useEffect(() => {
    if (document.activeElement !== field.current) setSynopsis(node.synopsis);
  }, [node.synopsis]);

  const open = () => (isFolder ? useUI.getState().openBoard(node.id) : useUI.getState().openDoc(node.id));

  return (
    <motion.div
      initial={overlay ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, scale: overlay ? 1.04 : 1, rotate: overlay ? 1.5 : 0 }}
      transition={spring}
      className={cn(
        "group flex h-[210px] flex-col overflow-hidden rounded-lg border border-line-strong bg-raised shadow-sm shadow-black/20 transition-[border-color] hover:border-faint",
        overlay && "cursor-grabbing shadow-2xl shadow-black/60",
      )}
    >
      <div className="h-[3px] shrink-0" style={{ background: isFolder ? "var(--color-warn)" : STATUS_COLORS[node.status] }} />
      <div {...handle} onDoubleClick={open} className="flex cursor-grab items-center gap-2 border-b border-line px-3 py-2 active:cursor-grabbing">
        <span className="font-mono text-[10px] text-faint">{String(number).padStart(2, "0")}</span>
        {isFolder && <Folder className="size-3.5 text-warn/80" />}
        <span className="flex-1 truncate text-[13px] font-medium text-fg">{node.title || "Untitled"}</span>
        <IconButton size="sm" label="Open" className="opacity-0 group-hover:opacity-100" onPointerDown={(e) => e.stopPropagation()} onClick={open}>
          <ArrowUpRight />
        </IconButton>
      </div>
      <textarea
        ref={field}
        value={synopsis}
        onChange={(e) => {
          const value = e.target.value;
          setSynopsis(value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => actions.updateNode(node.id, { synopsis: value }), 400);
        }}
        placeholder="Synopsis…"
        className="flex-1 resize-none bg-transparent px-3 py-2.5 font-mono text-[12px] leading-relaxed text-dim outline-none placeholder:text-faint focus:text-fg"
      />
      <div className="flex items-center justify-between border-t border-line px-3 py-1.5 text-[11px] text-mute">
        <span>{isFolder ? "Folder" : STATUS_LABELS[node.status]}</span>
        <span className="font-mono">{isFolder ? `${childCount} items` : `${node.wordCount.toLocaleString()} words`}</span>
      </div>
    </motion.div>
  );
}
