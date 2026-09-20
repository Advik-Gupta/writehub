"use client";

import type { Editor } from "@tiptap/react";
import { ArrowUpRight, Copy, Globe, Link2, Pencil, Unlink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { openLinkEditor } from "@/lib/editorActions";
import { useUI } from "@/lib/store";
import { Button, IconButton, spring } from "../ui";

const closeEditor = () => useUI.setState({ linkEditorPane: null });

export function LinkEditor({ editor, pane }: { editor: Editor; pane: number }) {
  const open = useUI((s) => s.linkEditorPane === pane);
  const [href, setHref] = useState("");
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const coords = editor.view.coordsAtPos(editor.state.selection.from);
    setPosition({ left: Math.min(coords.left, window.innerWidth - 380), top: coords.bottom + 8 });
    setHref(editor.getAttributes("link").href ?? "");
    const onDown = (e: MouseEvent) => !card.current?.contains(e.target as Node) && closeEditor();
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, editor]);

  const apply = () => {
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const url = /^([a-z][\w+.-]*:|\/|#)/i.test(value) ? value : `https://${value}`;
      if (editor.state.selection.empty && !editor.isActive("link")) {
        editor
          .chain()
          .focus()
          .insertContent({ type: "text", text: value, marks: [{ type: "link", attrs: { href: url } }] })
          .run();
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }
    }
    closeEditor();
  };

  return createPortal(
    <AnimatePresence>
      {open && position && (
        <motion.div
          ref={card}
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
          transition={spring}
          style={position}
          className="fixed z-50 flex w-[360px] items-center gap-1.5 rounded-lg border border-line-strong bg-raised p-1.5 shadow-2xl shadow-black/50"
        >
          <Link2 className="ml-1 size-3.5 shrink-0 text-mute" />
          <input
            autoFocus
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
              if (e.key === "Escape") {
                closeEditor();
                editor.commands.focus();
              }
            }}
            placeholder="Paste or type a link"
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
          />
          <Button size="sm" variant="primary" onClick={apply}>
            Apply
          </Button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface Hovered {
  href: string;
  rect: DOMRect;
  el: HTMLAnchorElement;
}

export function LinkHover({ editor, pane }: { editor: Editor; pane: number }) {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const editing = useUI((s) => s.linkEditorPane === pane);

  useEffect(() => {
    const dom = editor.view.dom;
    const anchorOf = (e: Event) => (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    const over = (e: MouseEvent) => {
      const a = anchorOf(e);
      if (!a) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHovered({ href: a.getAttribute("href") ?? "", rect: a.getBoundingClientRect(), el: a }), 280);
    };
    const out = (e: MouseEvent) => {
      if (!anchorOf(e)) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHovered(null), 300);
    };
    const click = (e: MouseEvent) => {
      const a = anchorOf(e);
      if (a && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.open(a.getAttribute("href")!, "_blank", "noopener");
      }
    };
    const hide = () => setHovered(null);
    dom.addEventListener("mouseover", over);
    dom.addEventListener("mouseout", out);
    dom.addEventListener("click", click);
    window.addEventListener("scroll", hide, true);
    return () => {
      clearTimeout(timer.current);
      dom.removeEventListener("mouseover", over);
      dom.removeEventListener("mouseout", out);
      dom.removeEventListener("click", click);
      window.removeEventListener("scroll", hide, true);
    };
  }, [editor]);

  const selectLink = (h: Hovered) => {
    editor.chain().focus().setTextSelection(editor.view.posAtDOM(h.el, 0)).extendMarkRange("link").run();
  };

  let host = hovered?.href ?? "";
  try {
    host = new URL(host).hostname.replace(/^www\./, "") + new URL(host).pathname.replace(/\/$/, "");
  } catch {}

  return createPortal(
    <AnimatePresence>
      {hovered && !editing && (
        <motion.div
          key={hovered.href + hovered.rect.top}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={spring}
          style={{ left: hovered.rect.left, top: hovered.rect.bottom + 6 }}
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={() => (timer.current = setTimeout(() => setHovered(null), 200))}
          className="fixed z-40 flex max-w-[380px] items-center gap-1 rounded-lg border border-line-strong bg-raised py-1 pr-1 pl-2.5 shadow-2xl shadow-black/50"
        >
          <Globe className="size-3.5 shrink-0 text-mute" />
          <span className="mr-1 truncate text-xs text-dim">{host}</span>
          <IconButton size="sm" label="Open" shortcut="⌘ click" onClick={() => window.open(hovered.href, "_blank", "noopener")}>
            <ArrowUpRight />
          </IconButton>
          <IconButton size="sm" label="Copy link" onClick={() => navigator.clipboard.writeText(hovered.href)}>
            <Copy />
          </IconButton>
          <IconButton
            size="sm"
            label="Edit"
            onClick={() => {
              selectLink(hovered);
              setHovered(null);
              openLinkEditor(editor);
            }}
          >
            <Pencil />
          </IconButton>
          <IconButton
            size="sm"
            label="Remove link"
            onClick={() => {
              selectLink(hovered);
              editor.chain().unsetLink().run();
              setHovered(null);
            }}
          >
            <Unlink />
          </IconButton>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
