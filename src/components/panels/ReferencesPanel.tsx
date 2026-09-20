"use client";

import { Book, ChevronDown, ChevronRight, Ellipsis, Eye, FolderPlus, Globe, Library, Newspaper, Pencil, Plus, TextQuote, Trash, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useState, type ReactNode } from "react";
import { actions, useCollections, useDocSources, useSettings, useSources } from "@/lib/api";
import { reference, renderSegs, STYLE_LABELS } from "@/lib/citations";
import { useCitations } from "@/lib/editorHooks";
import { useActiveEditor, useUI } from "@/lib/store";
import type { CitationStyle, Collection, Source, SourceKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Collapse, Empty, IconButton, inputClass, menuContentClass, menuItemClass, menuLabelClass, menuSeparatorClass, Segmented, spring } from "../ui";

type Tab = "essay" | "library" | "collections";

const KIND_ICONS: Record<SourceKind, typeof Globe> = { website: Globe, article: Newspaper, book: Book, person: User };

export function ReferencesPanel({ docId }: { docId: string | null }) {
  const [tab, setTab] = useState<Tab>(docId ? "essay" : "library");
  const { data: settings } = useSettings();
  const style = settings?.citationStyle ?? "mla";
  const openDialog = useUI((s) => s.openDialog);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-line p-4">
        <Segmented<Tab>
          layoutId="reference-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: "essay", label: "This essay" },
            { value: "library", label: "Library" },
            { value: "collections", label: "Collections" },
          ]}
        />
        <div className="flex items-center gap-2">
          <StylePicker style={style} />
          <div className="flex-1" />
          <Button size="sm" variant="primary" onClick={() => openDialog({ type: "source", attachTo: tab === "essay" && docId ? docId : undefined })}>
            <Plus className="size-3.5" />
            Add source
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8, transition: { duration: 0.08 } }}
            transition={spring}
            className="absolute inset-0 overflow-y-auto"
          >
            {tab === "essay" ? <EssaySources docId={docId} style={style} /> : tab === "library" ? <LibrarySources docId={docId} style={style} /> : <Collections style={style} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StylePicker({ style }: { style: CitationStyle }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex h-7 items-center gap-1.5 rounded-md border border-line-strong px-2 text-xs text-dim outline-none hover:border-faint hover:text-fg">
        {STYLE_LABELS[style]}
        <ChevronDown className="size-3 text-mute" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} className={menuContentClass}>
          <DropdownMenu.Label className={menuLabelClass}>Citation style</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={style} onValueChange={(v) => actions.updateSettings({ citationStyle: v as CitationStyle })}>
            {(Object.keys(STYLE_LABELS) as CitationStyle[]).map((s) => (
              <DropdownMenu.RadioItem key={s} value={s} className={cn(menuItemClass, s === style && "text-accent")}>
                {STYLE_LABELS[s]}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SourceCard({ source, style, badges, menu, onCite }: { source: Source; style: CitationStyle; badges?: ReactNode; menu: ReactNode; onCite?: () => void }) {
  const Icon = KIND_ICONS[source.kind];
  const year = source.date.match(/\d{4}/)?.[0];
  return (
    <motion.div layout="position" transition={spring} className="group rounded-lg border border-line bg-bg/40 p-3 transition-colors hover:border-line-strong">
      <div className="flex gap-2.5">
        <Icon className="mt-0.5 size-3.5 shrink-0 text-mute" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] leading-snug text-fg">{source.title || "Untitled source"}</p>
          <p className="mt-0.5 truncate text-xs text-mute">{[source.authors.split(";")[0], source.container, year].filter(Boolean).join(" · ")}</p>
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton size="sm" label="More" className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
              <Ellipsis />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={4} className={menuContentClass}>
              {menu}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <p className="mt-2 pl-6 text-[11.5px] leading-relaxed text-mute" dangerouslySetInnerHTML={{ __html: renderSegs(reference(source, style), "html") }} />
      {(badges || onCite) && (
        <div className="mt-2 flex items-center gap-1.5 pl-6">
          {badges}
          <div className="flex-1" />
          {onCite && (
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onCite}>
              <TextQuote className="size-3.5" />
              Cite
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

const Badge = ({ children, accent }: { children: ReactNode; accent?: boolean }) => (
  <span className={cn("rounded-full border px-1.5 py-px font-mono text-[10px]", accent ? "border-accent/40 text-accent" : "border-line-strong text-mute")}>{children}</span>
);

function MenuItem({ icon, children, onSelect, danger }: { icon: ReactNode; children: ReactNode; onSelect: () => void; danger?: boolean }) {
  return (
    <DropdownMenu.Item className={cn(menuItemClass, danger && "text-danger [&_svg]:text-danger")} onSelect={onSelect}>
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}

function SourceMenu({ source, docId, attached }: { source: Source; docId: string | null; attached: boolean }) {
  const { data: collections = [] } = useCollections();
  return (
    <>
      <MenuItem icon={<Pencil />} onSelect={() => useUI.setState({ dialog: { type: "source", sourceId: source.id } })}>
        Edit
      </MenuItem>
      {docId && (
        <MenuItem icon={attached ? <X /> : <Plus />} onSelect={() => actions.attachSource(docId, source.id, !attached)}>
          {attached ? "Remove from essay" : "Add to essay"}
        </MenuItem>
      )}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger className={menuItemClass}>
          <FolderPlus />
          Add to collection
          <ChevronRight className="ml-auto" />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal>
          <DropdownMenu.SubContent sideOffset={4} className={menuContentClass}>
            {collections.map((c) => {
              const inside = c.sourceIds.includes(source.id);
              return (
                <DropdownMenu.CheckboxItem
                  key={c.id}
                  checked={inside}
                  onCheckedChange={() => actions.updateCollection(c.id, { sourceIds: inside ? c.sourceIds.filter((id) => id !== source.id) : [...c.sourceIds, source.id] })}
                  className={cn(menuItemClass, inside && "text-accent")}
                >
                  {c.title}
                </DropdownMenu.CheckboxItem>
              );
            })}
            {collections.length > 0 && <DropdownMenu.Separator className={menuSeparatorClass} />}
            <MenuItem
              icon={<Plus />}
              onSelect={async () => {
                const title = window.prompt("Collection name");
                if (!title) return;
                const id = await actions.createCollection(title);
                await actions.updateCollection(id, { sourceIds: [source.id] });
              }}
            >
              New collection…
            </MenuItem>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
      <DropdownMenu.Separator className={menuSeparatorClass} />
      <MenuItem icon={<Trash />} danger onSelect={() => window.confirm(`Delete “${source.title}” from your library?`) && actions.deleteSource(source.id)}>
        Delete from library
      </MenuItem>
    </>
  );
}

function useCite() {
  const editor = useActiveEditor();
  return editor ? (sourceId: string) => useUI.setState({ dialog: { type: "cite", sourceId } }) : undefined;
}

function EssaySources({ docId, style }: { docId: string | null; style: CitationStyle }) {
  const { data: sources = [] } = useSources();
  const { data: docSources = [] } = useDocSources(docId);
  const citations = useCitations(useActiveEditor());
  const cite = useCite();

  if (!docId) return <Empty icon={<TextQuote />} title="No document open" />;

  const counts = new Map<string, number>();
  citations.forEach((c) => counts.set(c.sourceId, (counts.get(c.sourceId) ?? 0) + 1));
  const byId = new Map(sources.map((s) => [s.id, s]));
  const rows = docSources.map((ds) => ({ ds, source: byId.get(ds.sourceId) })).filter((r): r is { ds: (typeof docSources)[number]; source: Source } => !!r.source);

  return (
    <div className="space-y-2 p-4">
      {rows.length === 0 ? (
        <Empty icon={<TextQuote />} title="No sources in this essay">
          Cite something from your library, or add a new source.
        </Empty>
      ) : (
        rows.map(({ ds, source }) => (
          <SourceCard
            key={source.id}
            source={source}
            style={style}
            onCite={cite && (() => cite(source.id))}
            badges={
              <>
                {counts.get(source.id) ? <Badge accent>cited ×{counts.get(source.id)}</Badge> : null}
                {ds.manual && !counts.get(source.id) && <Badge>not cited yet</Badge>}
              </>
            }
            menu={<SourceMenu source={source} docId={docId} attached={ds.manual} />}
          />
        ))
      )}
      <Button className="mt-2 w-full" onClick={() => useUI.setState({ dialog: { type: "references", docId } })} disabled={!rows.length}>
        <Eye className="size-3.5" />
        Preview reference list
      </Button>
    </div>
  );
}

function LibrarySources({ docId, style }: { docId: string | null; style: CitationStyle }) {
  const { data: sources = [] } = useSources();
  const { data: docSources = [] } = useDocSources(docId);
  const [query, setQuery] = useState("");
  const cite = useCite();
  const q = query.toLowerCase();
  const filtered = sources.filter((s) => [s.title, s.authors, s.container].some((f) => f.toLowerCase().includes(q)));

  return (
    <div className="space-y-2 p-4">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${sources.length} sources`} className={inputClass} />
      {!sources.length && (
        <Empty icon={<Library />} title="Your library is empty">
          Sources you add are reusable across every document.
        </Empty>
      )}
      {filtered.map((source) => {
        const attached = !!docSources.find((d) => d.sourceId === source.id)?.manual;
        const inEssay = docSources.some((d) => d.sourceId === source.id);
        return (
          <SourceCard
            key={source.id}
            source={source}
            style={style}
            onCite={cite && (() => cite(source.id))}
            badges={inEssay ? <Badge accent>in essay</Badge> : undefined}
            menu={<SourceMenu source={source} docId={docId} attached={attached} />}
          />
        );
      })}
    </div>
  );
}

function Collections({ style }: { style: CitationStyle }) {
  const { data: collections = [] } = useCollections();
  const [title, setTitle] = useState("");

  return (
    <div className="space-y-2 p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && title.trim()) {
            await actions.createCollection(title.trim());
            setTitle("");
          }
        }}
        placeholder="New collection, press Enter"
        className={inputClass}
      />
      {!collections.length && (
        <Empty icon={<FolderPlus />} title="No collections">
          Group sources for a debate, a chapter, or a course.
        </Empty>
      )}
      {collections.map((c) => (
        <CollectionRow key={c.id} collection={c} style={style} />
      ))}
    </div>
  );
}

function CollectionRow({ collection, style }: { collection: Collection; style: CitationStyle }) {
  const { data: sources = [] } = useSources();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const members = collection.sourceIds.map((id) => sources.find((s) => s.id === id)).filter((s): s is Source => !!s);

  return (
    <div className="rounded-lg border border-line bg-bg/40">
      <div className="group flex h-9 items-center gap-2 px-2.5" onClick={() => !renaming && setOpen((o) => !o)}>
        <ChevronRight className={cn("size-3.5 text-mute transition-transform duration-200", open && "rotate-90")} />
        {renaming ? (
          <input
            autoFocus
            defaultValue={collection.title}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              setRenaming(false);
              if (e.target.value.trim()) actions.updateCollection(collection.id, { title: e.target.value.trim() });
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-6 flex-1 rounded border border-accent/60 bg-bg px-1.5 text-[13px] outline-none"
          />
        ) : (
          <span className="flex-1 truncate text-[13px]">{collection.title}</span>
        )}
        <Badge>{members.length}</Badge>
        <IconButton
          size="sm"
          label="Rename"
          className="opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setRenaming(true);
          }}
        >
          <Pencil />
        </IconButton>
        <IconButton
          size="sm"
          label="Delete collection"
          className="opacity-0 group-hover:opacity-100 hover:text-danger"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete collection “${collection.title}”? Sources stay in your library.`)) actions.deleteCollection(collection.id);
          }}
        >
          <Trash />
        </IconButton>
      </div>
      <Collapse open={open}>
        <div className="space-y-1 border-t border-line p-2">
          {!members.length && <p className="px-1 py-2 text-xs text-mute">Add sources from the Library tab.</p>}
          {members.map((s) => (
            <div key={s.id} className="group flex items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-hover">
              <p className="flex-1 text-xs leading-relaxed text-dim" dangerouslySetInnerHTML={{ __html: renderSegs(reference(s, style), "html") }} />
              <IconButton
                size="sm"
                label="Remove from collection"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => actions.updateCollection(collection.id, { sourceIds: collection.sourceIds.filter((id) => id !== s.id) })}
              >
                <X />
              </IconButton>
            </div>
          ))}
        </div>
      </Collapse>
    </div>
  );
}
