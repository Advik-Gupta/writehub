"use client";

import { BookOpen, ChevronDown, FileText, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { Fragment, useEffect, useState } from "react";
import { compile } from "@/lib/exporting";
import { useActiveDocId, useUI } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useTreeIndex } from "@/lib/tree";
import type { ExportFormat, TreeNode } from "@/lib/types";
import { cn, downloadFile } from "@/lib/utils";
import { Button, Checkbox, inputClass, menuContentClass, menuItemClass, menuLabelClass, Segmented, spring } from "../ui";

export function CompileForm({ folderId: initialFolder, onClose }: { folderId?: string; onClose: () => void }) {
  const index = useTreeIndex();
  const activeDocId = useActiveDocId();
  const [folderId, setFolderId] = useState(() => {
    if (initialFolder) return initialFolder;
    const projectId = (activeDocId && index.byId.get(activeDocId)?.projectId) || index.projects[0]?.id;
    return projectId ? index.roleFolder(projectId, "manuscript")?.id : undefined;
  });
  const [order, setOrder] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [includeTitles, setIncludeTitles] = useState(true);
  const [separator, setSeparator] = useState<"none" | "rule">("rule");
  const [format, setFormat] = useState<ExportFormat>("md");
  const [busy, setBusy] = useState(false);

  const docsUnder = folderId ? index.docsUnder(folderId).map((node) => node.id).join(",") : "";
  useEffect(() => {
    setOrder(docsUnder ? docsUnder.split(",") : []);
    setExcluded(new Set());
  }, [docsUnder]);

  const folder = folderId ? index.byId.get(folderId) : undefined;
  const defaultTitle = folder?.role === "manuscript" ? (index.project(folder.projectId)?.title ?? "Manuscript") : (folder?.title ?? "Manuscript");
  const included = order.filter((id) => !excluded.has(id) && index.byId.has(id));
  const words = included.reduce((sum, id) => sum + (index.byId.get(id)?.wordCount ?? 0), 0);

  const run = async (createDocument: boolean) => {
    setBusy(true);
    try {
      const finalTitle = title.trim() || defaultTitle;
      const result = await compile({ docIds: included, includeTitles, separator, format, title: finalTitle, createDocument });
      if ("docId" in result) {
        useUI.getState().openDoc(result.docId);
        toast(`Compiled ${included.length} documents into “${finalTitle}”`);
      } else {
        downloadFile(`${finalTitle}.${format}`, result.body, result.mime);
      }
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Compile failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-xs text-mute">Folder</span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className={cn(inputClass, "flex items-center justify-between gap-2 text-left")}>
              <span className="truncate">{folder ? `${index.project(folder.projectId)?.title} / ${folder.title}` : "Choose a folder"}</span>
              <ChevronDown className="size-3.5 shrink-0 text-mute" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="start" sideOffset={4} className={cn(menuContentClass, "z-[60] max-h-72 overflow-y-auto")}>
                {index.projects.map((p) => (
                  <Fragment key={p.id}>
                    <DropdownMenu.Label className={menuLabelClass}>{p.title}</DropdownMenu.Label>
                    {index.nodes
                      .filter((n) => n.projectId === p.id && n.kind === "folder" && !index.isTrashed(n.id))
                      .map((f) => (
                        <DropdownMenu.Item
                          key={f.id}
                          onSelect={() => setFolderId(f.id)}
                          className={cn(menuItemClass, f.id === folderId && "text-accent")}
                          style={{ paddingLeft: 8 + index.ancestors(f.id).length * 12 }}
                        >
                          {f.title}
                        </DropdownMenu.Item>
                      ))}
                  </Fragment>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-mute">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle} className={inputClass} />
        </label>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-mute">
          <span>Order · drag to rearrange</span>
          <span className="font-mono">
            {included.length} docs · {words.toLocaleString()} words
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-line bg-bg/50 p-1">
          {!order.length && <p className="px-3 py-6 text-center text-xs text-mute">This folder has no documents.</p>}
          <Reorder.Group axis="y" values={order} onReorder={setOrder}>
            {order.map((id) => {
              const node = index.byId.get(id);
              return node ? (
                <CompileRow
                  key={id}
                  node={node}
                  depth={index.ancestors(id).length - index.ancestors(folderId!).length - 1}
                  included={!excluded.has(id)}
                  onToggle={() =>
                    setExcluded((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                />
              ) : null;
            })}
          </Reorder.Group>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="space-y-1.5">
          <span className="text-xs text-mute">Format</span>
          <Segmented<ExportFormat>
            layoutId="compile-format"
            value={format}
            onChange={setFormat}
            options={[
              { value: "md", label: "Markdown" },
              { value: "html", label: "HTML" },
              { value: "txt", label: "Text" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs text-mute">Between documents</span>
          <Segmented
            layoutId="compile-separator"
            value={separator}
            onChange={setSeparator}
            options={[
              { value: "rule", label: "Divider" },
              { value: "none", label: "Nothing" },
            ]}
          />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-[13px] text-dim">
          <Checkbox checked={includeTitles} onChange={setIncludeTitles} />
          Use each document&apos;s title as a chapter heading
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button disabled={!included.length || busy} onClick={() => run(true)}>
          <FileText className="size-3.5" />
          Create as document
        </Button>
        <Button variant="primary" disabled={!included.length || busy} onClick={() => run(false)}>
          <BookOpen className="size-3.5" />
          Compile & download
        </Button>
      </div>
    </div>
  );
}

function CompileRow({ node, depth, included, onToggle }: { node: TreeNode; depth: number; included: boolean; onToggle: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={node.id}
      dragListener={false}
      dragControls={controls}
      transition={spring}
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}
      className="flex h-8 items-center gap-2 rounded-md bg-bg pr-3 hover:bg-hover"
      style={{ paddingLeft: 4 + Math.max(0, depth) * 14 }}
    >
      <GripVertical onPointerDown={(e) => controls.start(e)} className="size-3.5 shrink-0 cursor-grab text-faint active:cursor-grabbing" />
      <Checkbox checked={included} onChange={onToggle} />
      <span className={cn("flex-1 truncate text-[13px]", included ? "text-fg" : "text-mute line-through")}>{node.title || "Untitled"}</span>
      <span className="font-mono text-[11px] text-faint">{node.wordCount.toLocaleString()}</span>
    </Reorder.Item>
  );
}
