"use client";

import { Command } from "cmdk";
import { BookOpen, Columns2, FilePlus, FileText, FolderPlus, Hash, LayoutGrid, Lock, LogOut, PanelLeft, PanelRight, Pilcrow, Search, Settings, TextQuote, UserRound } from "lucide-react";
import { useDeferredValue, useState, type ReactNode } from "react";
import { actions, useSearch } from "@/lib/api";
import { useUI } from "@/lib/store";
import { lockNow, signOut } from "@/lib/session";
import { createDocument, useTreeIndex } from "@/lib/tree";
import { escapeHtml, relativeTime } from "@/lib/utils";
import { Kbd } from "../ui";
import { toggleCorkboard } from "../workspace/IconRail";

interface PaletteCommand {
  id: string;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  run: () => void;
}

const COMMANDS: PaletteCommand[] = [
  { id: "new-doc", label: "New document", icon: <FilePlus />, shortcut: "⌥⌘N", run: () => createDocument() },
  {
    id: "new-project",
    label: "New project",
    icon: <FolderPlus />,
    run: async () => {
      const id = await actions.createProject("Untitled project");
      useUI.setState({ leftOpen: true, leftView: "binder", renamingId: id });
    },
  },
  { id: "split", label: "Toggle split view", icon: <Columns2 />, shortcut: "⌥⌘\\", run: () => useUI.getState().toggleSplit() },
  { id: "board", label: "Toggle corkboard", icon: <LayoutGrid />, shortcut: "⌥⌘G", run: toggleCorkboard },
  { id: "compile", label: "Compile…", icon: <BookOpen />, run: () => useUI.setState({ dialog: { type: "compile" } }) },
  { id: "binder", label: "Toggle binder", icon: <PanelLeft />, shortcut: "⌥⌘B", run: () => useUI.setState((s) => ({ leftOpen: !s.leftOpen })) },
  { id: "inspector", label: "Toggle inspector", icon: <PanelRight />, shortcut: "⌥⌘R", run: () => useUI.setState((s) => ({ rightOpen: !s.rightOpen })) },
  { id: "toolbar", label: "Toggle formatting toolbar", icon: <Pilcrow />, run: () => useUI.setState((s) => ({ showToolbar: !s.showToolbar })) },
  { id: "lock", label: "Lock workspace", icon: <Lock />, run: () => lockNow() },
  { id: "account", label: "Account settings", icon: <UserRound />, run: () => { window.location.href = "/account"; } },
  { id: "signout", label: "Sign out", icon: <LogOut />, run: () => { signOut(); } },
  { id: "settings", label: "Settings", icon: <Settings />, run: () => useUI.setState({ dialog: { type: "settings" } }) },
];

const itemClass = "flex h-10 cursor-default items-center gap-3 rounded-md px-3 text-[13px] text-dim data-[selected=true]:bg-hover data-[selected=true]:text-fg [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-mute";

function Snippet({ text }: { text: string }) {
  const html = escapeHtml(text).replace(/\u0001/g, '<mark class="bg-accent/20 text-fg rounded-sm">').replace(/\u0002/g, "</mark>");
  return <span className="block truncate text-xs text-mute" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const { data: results } = useSearch(deferred);
  const index = useTreeIndex();
  const { openDoc } = useUI.getState();
  const q = query.trim().toLowerCase();
  const commands = COMMANDS.filter((c) => !q || c.label.toLowerCase().includes(q));
  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <Command shouldFilter={false} loop className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 text-mute" />
        <Command.Input value={query} onValueChange={setQuery} placeholder="Search documents, sources, tags, and commands…" className="h-13 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint" />
        <Kbd>esc</Kbd>
      </div>
      <Command.List className="max-h-[440px] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-mute [&_[cmdk-group-heading]]:uppercase">
        <Command.Empty className="px-3 py-8 text-center text-[13px] text-mute">Nothing matches “{query}”.</Command.Empty>

        {!q && (
          <Command.Group heading="Recent">
            {index.recentDocs(5).map((doc) => (
              <Command.Item key={doc.id} value={`recent-${doc.id}`} onSelect={() => run(() => openDoc(doc.id))} className={itemClass}>
                <FileText />
                <span className="flex-1 truncate">{doc.title || "Untitled"}</span>
                <span className="text-xs text-faint">{relativeTime(doc.updatedAt)}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {q && !!results?.documents.length && (
          <Command.Group heading="Documents">
            {results.documents.map((doc) => (
              <Command.Item key={doc.id} value={`doc-${doc.id}`} onSelect={() => run(() => openDoc(doc.id))} className={`${itemClass} h-auto py-2`}>
                <FileText />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-fg">{doc.title || "Untitled"}</span>
                    <span className="shrink-0 text-[11px] text-faint">{doc.projectTitle}</span>
                  </span>
                  {doc.snippet && <Snippet text={doc.snippet} />}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {q && !!results?.sources.length && (
          <Command.Group heading="Sources">
            {results.sources.map((s) => (
              <Command.Item
                key={s.id}
                value={`source-${s.id}`}
                onSelect={() => run(() => useUI.setState({ dialog: { type: "source", sourceId: s.id } }))}
                className={itemClass}
              >
                <TextQuote />
                <span className="flex-1 truncate">{s.title}</span>
                <span className="max-w-40 truncate text-xs text-faint">{s.authors}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {q && !!results?.tags.length && (
          <Command.Group heading="Tags">
            {results.tags.map((tag) => (
              <Command.Item key={tag} value={`tag-${tag}`} onSelect={() => run(() => useUI.setState({ activeTag: tag, leftOpen: true, leftView: "tags" }))} className={itemClass}>
                <Hash />
                <span className="flex-1 truncate">{tag}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {commands.length > 0 && (
          <Command.Group heading="Commands">
            {commands.map((c) => (
              <Command.Item key={c.id} value={`cmd-${c.id}`} onSelect={() => run(c.run)} className={itemClass}>
                {c.icon}
                <span className="flex-1">{c.label}</span>
                {c.shortcut && <Kbd>{c.shortcut}</Kbd>}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command>
  );
}
