"use client";

import { ChevronDown, Copy, Share2, Star, Trash } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Fragment, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { actions, useDoc, useSettings } from "@/lib/api";
import { useUI } from "@/lib/store";
import { useTreeIndex } from "@/lib/tree";
import { STATUS_LABELS, type DocRecord, type DocStatus } from "@/lib/types";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import { StatusDot } from "../StatusDot";
import { Button, menuContentClass, menuItemClass, menuLabelClass, PanelSection } from "../ui";

function useTicker(ms: number) {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms]);
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-h-7 items-center gap-3">
    <dt className="w-[84px] shrink-0 text-xs text-mute">{label}</dt>
    <dd className="min-w-0 flex-1 truncate text-[13px] text-dim">{children}</dd>
  </div>
);

const triggerClass = "-ml-1.5 flex h-7 max-w-full items-center gap-2 rounded-md px-1.5 text-[13px] text-dim outline-none transition-colors hover:bg-hover hover:text-fg data-[state=open]:bg-hover";

export function InfoPanel({ docId }: { docId: string }) {
  const { data: doc } = useDoc(docId);
  const index = useTreeIndex();
  const { data: settings } = useSettings();
  useTicker(30_000);

  if (!doc) return null;
  const parents = index.ancestors(doc.id);
  const project = index.project(doc.projectId);

  return (
    <div className="h-full overflow-y-auto">
      <PanelSection title="Document">
        <dl className="space-y-1">
          <Row label="Status">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className={triggerClass}>
                <StatusDot status={doc.status} />
                {STATUS_LABELS[doc.status]}
                <ChevronDown className="size-3 text-mute" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="start" sideOffset={4} className={menuContentClass}>
                  {(Object.keys(STATUS_LABELS) as DocStatus[]).map((status) => (
                    <DropdownMenu.Item key={status} className={cn(menuItemClass, status === doc.status && "text-accent")} onSelect={() => actions.updateNode(doc.id, { status })}>
                      <StatusDot status={status} />
                      {STATUS_LABELS[status]}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Row>
          <Row label="Folder">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className={triggerClass}>
                <span className="truncate">{[project?.title, ...parents.map((p) => p.title)].join(" / ")}</span>
                <ChevronDown className="size-3 shrink-0 text-mute" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="start" sideOffset={4} className={cn(menuContentClass, "max-h-80 overflow-y-auto")}>
                  {index.projects.map((p) => (
                    <Fragment key={p.id}>
                      <DropdownMenu.Label className={menuLabelClass}>{p.title}</DropdownMenu.Label>
                      {index.nodes
                        .filter((n) => n.projectId === p.id && n.kind === "folder" && !index.isTrashed(n.id))
                        .sort((a, b) => index.ancestors(a.id).map((x) => x.position).concat(a.position).join(".").localeCompare(index.ancestors(b.id).map((x) => x.position).concat(b.position).join(".")))
                        .map((folder) => (
                          <DropdownMenu.Item
                            key={folder.id}
                            disabled={folder.id === doc.parentId}
                            className={cn(menuItemClass, folder.id === doc.parentId && "text-accent")}
                            style={{ paddingLeft: 8 + index.ancestors(folder.id).length * 12 }}
                            onSelect={() => actions.moveNode(doc.id, folder.id, Number.MAX_SAFE_INTEGER)}
                          >
                            {folder.title}
                          </DropdownMenu.Item>
                        ))}
                    </Fragment>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Row>
          <Row label="Created">{formatDate(doc.createdAt)}</Row>
          <Row label="Last edited">{relativeTime(doc.updatedAt)}</Row>
          <Row label="Author">{settings?.author}</Row>
          <Row label="Words">{doc.wordCount.toLocaleString()}</Row>
        </dl>
      </PanelSection>

      <PanelSection title="Synopsis">
        <SynopsisField key={doc.id} doc={doc} />
      </PanelSection>

      <PanelSection title="Actions" className="border-b-0">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => actions.updateNode(doc.id, { starred: !doc.starred })} className={cn(doc.starred && "border-warn/40 text-warn")}>
            <Star className={cn("size-3.5", doc.starred && "fill-warn")} />
            {doc.starred ? "Starred" : "Star"}
          </Button>
          <Button
            onClick={async () => {
              const copy = await actions.duplicateNode(doc.id);
              useUI.getState().openDoc(copy.id);
            }}
          >
            <Copy className="size-3.5" />
            Duplicate
          </Button>
          <Button onClick={() => useUI.setState({ dialog: { type: "share", docId: doc.id } })}>
            <Share2 className="size-3.5" />
            Share
          </Button>
          <Button variant="danger" disabled={index.isTrashed(doc.id)} onClick={() => actions.deleteNode(doc.id)}>
            <Trash className="size-3.5" />
            Trash
          </Button>
        </div>
      </PanelSection>
    </div>
  );
}

function SynopsisField({ doc }: { doc: DocRecord }) {
  const [value, setValue] = useState(doc.synopsis);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <textarea
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        clearTimeout(timer.current);
        const next = e.target.value;
        timer.current = setTimeout(() => actions.updateNode(doc.id, { synopsis: next }), 400);
      }}
      rows={4}
      placeholder="A few lines on what this piece is about. Shown on the corkboard."
      className="w-full resize-none rounded-md border border-line bg-bg/50 px-2.5 py-2 text-[13px] leading-relaxed text-dim outline-none placeholder:text-faint focus:border-accent/50 focus:text-fg"
    />
  );
}
