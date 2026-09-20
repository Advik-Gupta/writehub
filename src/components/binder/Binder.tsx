"use client";

import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Columns2,
  Copy,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  Library,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Star,
  Trash,
} from "lucide-react";
import { motion } from "motion/react";
import { ContextMenu } from "radix-ui";
import { useRef, useState, type ReactNode } from "react";
import { create } from "zustand";
import { actions } from "@/lib/api";
import { useUI } from "@/lib/store";
import { createDocument, createFolder, purgeFromPanes, useTreeIndex, type TreeIndex } from "@/lib/tree";
import type { Project, TreeNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Collapse, IconButton, menuContentClass, menuItemClass, menuSeparatorClass, PanelHeader, spring } from "../ui";

type Zone = "before" | "after" | "inside";

const useDrag = create<{ dragId: string | null; over: { id: string; zone: Zone } | null }>(() => ({ dragId: null, over: null }));

export function Binder() {
  const index = useTreeIndex();
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Binder">
        <IconButton size="sm" label="New document" shortcut="⌥⌘N" onClick={() => createDocument()}>
          <FilePlus />
        </IconButton>
        <IconButton
          size="sm"
          label="New project"
          onClick={async () => {
            const id = await actions.createProject("Untitled project");
            useUI.setState({ renamingId: id });
          }}
        >
          <FolderPlus />
        </IconButton>
      </PanelHeader>
      <div className="flex-1 overflow-y-auto px-2 pt-1 pb-10">
        {index.projects.map((project) => (
          <ProjectSection key={project.id} project={project} index={index} />
        ))}
      </div>
    </div>
  );
}

function MenuItem({ icon, children, onSelect, danger }: { icon: ReactNode; children: ReactNode; onSelect: () => void; danger?: boolean }) {
  return (
    <ContextMenu.Item className={cn(menuItemClass, danger && "text-danger [&_svg]:text-danger")} onSelect={onSelect}>
      {icon}
      {children}
    </ContextMenu.Item>
  );
}

const Separator = () => <ContextMenu.Separator className={menuSeparatorClass} />;

function ProjectSection({ project, index }: { project: Project; index: TreeIndex }) {
  const expanded = useUI((s) => s.expanded[project.id] ?? true);
  const renaming = useUI((s) => s.renamingId === project.id);
  const toggleExpanded = useUI((s) => s.toggleExpanded);
  const manuscript = index.roleFolder(project.id, "manuscript");

  return (
    <div className="mt-2">
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div
            onClick={() => toggleExpanded(project.id, !expanded)}
            onDragOver={(e) => useDrag.getState().dragId && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const { dragId } = useDrag.getState();
              useDrag.setState({ dragId: null, over: null });
              if (dragId && manuscript) actions.moveNode(dragId, manuscript.id, index.childrenOf(manuscript.id).length);
            }}
            className="group flex h-7 items-center gap-1 rounded-md px-1.5 transition-colors hover:bg-hover/60"
          >
            <ChevronRight className={cn("size-3 shrink-0 text-faint transition-transform duration-200", expanded && "rotate-90")} />
            {renaming ? (
              <RenameInput initial={project.title} onDone={(v) => v && actions.renameProject(project.id, v)} />
            ) : (
              <span className="flex-1 truncate text-[11px] font-semibold tracking-wider text-mute uppercase">{project.title}</span>
            )}
            <IconButton
              size="sm"
              label="New document"
              className="opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                if (manuscript) createDocument(manuscript.id);
              }}
            >
              <Plus />
            </IconButton>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className={menuContentClass}>
            <MenuItem icon={<FilePlus />} onSelect={() => manuscript && createDocument(manuscript.id)}>
              New document
            </MenuItem>
            <MenuItem icon={<BookOpen />} onSelect={() => useUI.setState({ dialog: { type: "compile", folderId: manuscript?.id } })}>
              Compile manuscript
            </MenuItem>
            <MenuItem icon={<Pencil />} onSelect={() => useUI.setState({ renamingId: project.id })}>
              Rename project
            </MenuItem>
            <Separator />
            <MenuItem
              icon={<Trash />}
              danger
              onSelect={() => window.confirm(`Delete “${project.title}” and everything in it? This cannot be undone.`) && actions.deleteProject(project.id)}
            >
              Delete project
            </MenuItem>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <Collapse open={expanded}>
        {index.rootsOf(project.id).map((node) => (
          <TreeRow key={node.id} node={node} depth={0} index={index} />
        ))}
      </Collapse>
    </div>
  );
}

function TreeRow({ node, depth, index }: { node: TreeNode; depth: number; index: TreeIndex }) {
  const expanded = useUI((s) => !!s.expanded[node.id]);
  const renaming = useUI((s) => s.renamingId === node.id);
  const active = useUI((s) => {
    const p = s.panes[s.activePane];
    return (p?.kind === "doc" && p.id === node.id) || (p?.kind === "board" && p.folderId === node.id);
  });
  const openElsewhere = useUI((s) => s.panes.some((p, i) => i !== s.activePane && p?.kind === "doc" && p.id === node.id));
  const { toggleExpanded, openDoc, openBoard } = useUI.getState();
  const over = useDrag((s) => (s.over?.id === node.id ? s.over.zone : null));

  const children = index.childrenOf(node.id);
  const isFolder = node.kind === "folder";
  const trashed = index.isTrashed(node.id);
  const Icon =
    node.role === "manuscript" ? BookOpen : node.role === "research" ? Library : node.role === "trash" ? Trash : isFolder ? (expanded ? FolderOpen : Folder) : FileText;

  const zoneFor = (e: React.DragEvent): Zone => {
    if (node.role) return "inside";
    const rect = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    if (isFolder) return y < 0.28 ? "before" : y > 0.72 ? "after" : "inside";
    return y < 0.5 ? "before" : "after";
  };

  const onDragOver = (e: React.DragEvent) => {
    const { dragId, over: current } = useDrag.getState();
    if (!dragId || dragId === node.id || index.ancestors(node.id).some((a) => a.id === dragId)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const zone = zoneFor(e);
    if (current?.id !== node.id || current.zone !== zone) useDrag.setState({ over: { id: node.id, zone } });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { dragId, over: target } = useDrag.getState();
    useDrag.setState({ dragId: null, over: null });
    if (!dragId || !target) return;
    if (target.zone === "inside") {
      toggleExpanded(node.id, true);
      actions.moveNode(dragId, node.id, index.childrenOf(node.id).filter((c) => c.id !== dragId).length);
      return;
    }
    const siblings = index.childrenOf(node.parentId!).filter((c) => c.id !== dragId);
    const at = siblings.findIndex((c) => c.id === node.id);
    actions.moveNode(dragId, node.parentId!, target.zone === "before" ? at : at + 1);
  };

  return (
    <div>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div
            draggable={!node.role && !renaming}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", node.title);
              useDrag.setState({ dragId: node.id });
            }}
            onDragEnd={() => useDrag.setState({ dragId: null, over: null })}
            onDragOver={onDragOver}
            onDragLeave={() => useDrag.getState().over?.id === node.id && useDrag.setState({ over: null })}
            onDrop={onDrop}
            onClick={() => (isFolder ? toggleExpanded(node.id) : openDoc(node.id))}
            onDoubleClick={() => isFolder && node.role !== "trash" && openBoard(node.id)}
            className={cn(
              "group relative flex h-7 items-center gap-1.5 rounded-md pr-1 text-[13px] transition-colors duration-100 select-none",
              active ? "bg-hover text-fg" : "text-dim hover:bg-hover/60 hover:text-fg",
              over === "inside" && "bg-accent/10 ring-1 ring-accent/50 ring-inset",
              trashed && !node.role && "text-mute",
            )}
            style={{ paddingLeft: 4 + depth * 14 }}
          >
            {over === "before" && <span className="pointer-events-none absolute -top-px right-1 left-3 h-0.5 rounded-full bg-accent" />}
            {over === "after" && <span className="pointer-events-none absolute right-1 -bottom-px left-3 h-0.5 rounded-full bg-accent" />}
            {active && <motion.span layoutId="binder-active" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" transition={spring} />}
            <span className="flex size-4 shrink-0 items-center justify-center">
              {isFolder && children.length > 0 && <ChevronRight className={cn("size-3 text-mute transition-transform duration-200", expanded && "rotate-90")} />}
            </span>
            <Icon className={cn("size-[15px] shrink-0", node.role ? "text-mute" : isFolder ? "text-warn/80" : active ? "text-accent" : "text-mute")} />
            {renaming ? (
              <RenameInput initial={node.title} onDone={(v) => v !== null && actions.updateNode(node.id, { title: v })} />
            ) : (
              <span className="flex-1 truncate">{node.title || (isFolder ? "Untitled folder" : "Untitled")}</span>
            )}
            {node.starred && <Star className="size-3 shrink-0 fill-warn text-warn" />}
            {openElsewhere && <span className="size-1.5 shrink-0 rounded-full bg-info" title="Open in the other pane" />}
            {node.role === "trash" && children.length > 0 && <span className="px-1 font-mono text-[10px] text-faint">{children.length}</span>}
            {isFolder && !trashed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  createDocument(node.id);
                }}
                className="flex size-5 shrink-0 items-center justify-center rounded text-mute opacity-0 transition-opacity group-hover:opacity-100 hover:bg-line-strong hover:text-fg"
              >
                <Plus className="size-3" />
              </button>
            )}
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className={menuContentClass}>
            <NodeMenu node={node} trashed={trashed} index={index} />
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      {isFolder && (
        <Collapse open={expanded}>
          {children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} index={index} />
          ))}
        </Collapse>
      )}
    </div>
  );
}

function NodeMenu({ node, trashed, index }: { node: TreeNode; trashed: boolean; index: TreeIndex }) {
  const ui = useUI.getState();
  const rename = () => useUI.setState({ renamingId: node.id });

  if (node.role === "trash") {
    return (
      <MenuItem
        icon={<Trash />}
        danger
        onSelect={() => {
          if (!window.confirm("Permanently delete everything in the trash?")) return;
          index.docsUnder(node.id).forEach((d) => purgeFromPanes(d.id));
          actions.emptyTrash(node.projectId);
        }}
      >
        Empty trash
      </MenuItem>
    );
  }

  if (trashed) {
    return (
      <>
        <MenuItem icon={<RotateCcw />} onSelect={() => actions.restoreNode(node.id)}>
          Restore
        </MenuItem>
        <MenuItem
          icon={<Trash />}
          danger
          onSelect={() => {
            if (!window.confirm(`Permanently delete “${node.title || "Untitled"}”?`)) return;
            [node, ...index.docsUnder(node.id)].forEach((d) => purgeFromPanes(d.id));
            actions.deleteNode(node.id);
          }}
        >
          Delete forever
        </MenuItem>
      </>
    );
  }

  const trashItem = !node.role && (
    <>
      <Separator />
      <MenuItem icon={<Trash />} danger onSelect={() => actions.deleteNode(node.id)}>
        Move to trash
      </MenuItem>
    </>
  );

  if (node.kind === "folder") {
    return (
      <>
        <MenuItem icon={<FilePlus />} onSelect={() => createDocument(node.id)}>
          New document
        </MenuItem>
        <MenuItem icon={<FolderPlus />} onSelect={() => createFolder(node.id)}>
          New folder
        </MenuItem>
        <Separator />
        <MenuItem icon={<LayoutGrid />} onSelect={() => ui.openBoard(node.id)}>
          Open corkboard
        </MenuItem>
        <MenuItem icon={<BookOpen />} onSelect={() => useUI.setState({ dialog: { type: "compile", folderId: node.id } })}>
          Compile…
        </MenuItem>
        {!node.role && (
          <>
            <Separator />
            <MenuItem icon={<Pencil />} onSelect={rename}>
              Rename
            </MenuItem>
            <MenuItem icon={<Copy />} onSelect={() => actions.duplicateNode(node.id)}>
              Duplicate
            </MenuItem>
          </>
        )}
        {trashItem}
      </>
    );
  }

  return (
    <>
      <MenuItem icon={<ArrowUpRight />} onSelect={() => ui.openDoc(node.id)}>
        Open
      </MenuItem>
      <MenuItem
        icon={<Columns2 />}
        onSelect={() => {
          const state = useUI.getState();
          if (state.panes.length === 1) state.toggleSplit();
          const { activePane } = useUI.getState();
          useUI.getState().openDoc(node.id, state.panes.length === 1 ? 1 : activePane === 0 ? 1 : 0);
        }}
      >
        Open in split view
      </MenuItem>
      <Separator />
      <MenuItem icon={<Pencil />} onSelect={rename}>
        Rename
      </MenuItem>
      <MenuItem
        icon={<Copy />}
        onSelect={async () => {
          const copy = await actions.duplicateNode(node.id);
          ui.openDoc(copy.id);
        }}
      >
        Duplicate
      </MenuItem>
      <MenuItem icon={<Star />} onSelect={() => actions.updateNode(node.id, { starred: !node.starred })}>
        {node.starred ? "Unstar" : "Star"}
      </MenuItem>
      <MenuItem icon={<Share2 />} onSelect={() => useUI.setState({ dialog: { type: "share", docId: node.id } })}>
        Share & export…
      </MenuItem>
      {trashItem}
    </>
  );
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (value: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (result: string | null) => {
    if (done.current) return;
    done.current = true;
    useUI.setState({ renamingId: null });
    onDone(result);
  };
  return (
    <input
      autoFocus
      value={value}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(value.trim());
        if (e.key === "Escape") finish(null);
      }}
      onBlur={() => finish(value.trim())}
      className="h-6 min-w-0 flex-1 rounded border border-accent/60 bg-bg px-1.5 text-[13px] text-fg outline-none"
    />
  );
}
