"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  Baseline,
  Bold,
  ChevronDown,
  Code,
  Columns3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  ListTodo,
  MessageSquarePlus,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Search,
  SquareCode,
  Strikethrough,
  Table,
  TableCellsMerge,
  TableCellsSplit,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu, Popover } from "radix-ui";
import { forwardRef, useState, type ComponentProps } from "react";
import { addComment, openFind, openLinkEditor, pickImage } from "@/lib/editorActions";
import { cn } from "@/lib/utils";
import { IconButton, menuContentClass, menuItemClass, spring } from "../ui";

const TEXT_COLORS = [null, "#a4a4a1", "#f07171", "#f0a066", "#e8c95a", "#5fd38d", "#38d9a9", "#72aefc", "#b59dff", "#f28dc5"];
const HIGHLIGHTS = [null, "rgba(240,113,113,0.32)", "rgba(240,160,102,0.32)", "rgba(232,201,90,0.34)", "rgba(95,211,141,0.28)", "rgba(114,174,252,0.3)", "rgba(181,157,255,0.3)", "rgba(242,141,197,0.3)"];

const BLOCK_STYLES = [
  { level: 0, label: "Normal text", className: "text-[13px]" },
  { level: 1, label: "Heading 1", className: "text-lg font-semibold" },
  { level: 2, label: "Heading 2", className: "text-base font-semibold" },
  { level: 3, label: "Heading 3", className: "text-sm font-semibold" },
] as const;

const Tool = forwardRef<HTMLButtonElement, ComponentProps<typeof IconButton>>(function Tool({ className, ...props }, ref) {
  return <IconButton ref={ref} className={cn("size-7 [&_svg]:size-[15px]", className)} {...props} />;
});

const Divider = () => <div className="mx-1.5 h-4 w-px shrink-0 bg-line-strong" />;

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e.isDestroyed
        ? null
        : ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      heading: ([1, 2, 3] as const).find((level) => e.isActive("heading", { level })) ?? 0,
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
      highlight: (e.getAttributes("highlight").color as string | undefined) ?? null,
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
      hasSelection: !e.state.selection.empty,
      listItem: e.isActive("taskItem") ? "taskItem" : e.isActive("listItem") ? "listItem" : null,
          } as const),
  });

  const chain = () => editor.chain().focus();
  if (!s) return null;
  const blockLabel = BLOCK_STYLES.find((b) => b.level === s.heading)!.label;

  return (
    <div className="flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line px-3 [scrollbar-width:none]">
      <Tool label="Undo" shortcut="⌘Z" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 />
      </Tool>
      <Tool label="Redo" shortcut="⇧⌘Z" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 />
      </Tool>
      <Divider />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="flex h-7 w-[112px] shrink-0 items-center justify-between gap-1 rounded-md px-2 text-[12.5px] text-dim transition-colors outline-none hover:bg-hover hover:text-fg data-[state=open]:bg-hover">
          {blockLabel}
          <ChevronDown className="size-3.5 text-mute" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={menuContentClass} sideOffset={4} align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            {BLOCK_STYLES.map((style) => (
              <DropdownMenu.Item
                key={style.level}
                className={cn(menuItemClass, "h-9", style.className, s.heading === style.level && "text-accent")}
                onSelect={() => (style.level ? chain().setHeading({ level: style.level }).run() : chain().setParagraph().run())}
              >
                {style.label}
                <span className="ml-auto pl-4 font-mono text-[10px] font-normal text-faint">⌘⌥{style.level}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Divider />

      <Tool label="Bold" shortcut="⌘B" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </Tool>
      <Tool label="Italic" shortcut="⌘I" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool label="Underline" shortcut="⌘U" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline />
      </Tool>
      <Tool label="Strikethrough" shortcut="⇧⌘S" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough />
      </Tool>
      <SwatchPicker
        label="Text color"
        icon={<Baseline />}
        current={s.color}
        colors={TEXT_COLORS}
        onPick={(c) => (c ? chain().setColor(c).run() : chain().unsetColor().run())}
        renderSwatch={(c) => <span className="text-sm font-semibold" style={{ color: c ?? "var(--color-fg)" }}>A</span>}
      />
      <SwatchPicker
        label="Highlight"
        icon={<Highlighter />}
        current={s.highlight}
        colors={HIGHLIGHTS}
        onPick={(c) => (c ? chain().setHighlight({ color: c }).run() : chain().unsetHighlight().run())}
        renderSwatch={(c) => <span className="size-full rounded" style={{ background: c ?? "transparent" }} />}
      />
      <Divider />

      <Tool label="Link" shortcut="⌘K" active={s.link} onClick={() => openLinkEditor(editor)}>
        <Link />
      </Tool>
      <Tool label="Image" onClick={() => pickImage(editor)}>
        <ImageIcon />
      </Tool>
      <TableInsert editor={editor} />
      <Divider />

      <Tool label="Bulleted list" shortcut="⇧⌘8" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List />
      </Tool>
      <Tool label="Numbered list" shortcut="⇧⌘7" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </Tool>
      <Tool label="Checklist" shortcut="⇧⌘9" active={s.task} onClick={() => chain().toggleTaskList().run()}>
        <ListTodo />
      </Tool>
      <Tool label="Decrease indent" shortcut="⇧Tab" disabled={!s.listItem} onClick={() => s.listItem && chain().liftListItem(s.listItem).run()}>
        <ListIndentDecrease />
      </Tool>
      <Tool label="Increase indent" shortcut="Tab" disabled={!s.listItem} onClick={() => s.listItem && chain().sinkListItem(s.listItem).run()}>
        <ListIndentIncrease />
      </Tool>
      <Divider />

      <Tool label="Quote" shortcut="⇧⌘B" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote />
      </Tool>
      <Tool label="Code block" shortcut="⌥⌘C" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
        <SquareCode />
      </Tool>
      <Tool label="Inline code" shortcut="⌘E" active={s.code} onClick={() => chain().toggleCode().run()}>
        <Code />
      </Tool>
      <Tool label="Clear formatting" shortcut="⌘\" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting />
      </Tool>

      <AnimatePresence initial={false}>
        {s.table && (
          <motion.div
            className="flex items-center gap-0.5 overflow-hidden"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
          >
            <Divider />
            <Tool label="Add row below" onClick={() => chain().addRowAfter().run()}>
              <Rows3 />
            </Tool>
            <Tool label="Add column right" onClick={() => chain().addColumnAfter().run()}>
              <Columns3 />
            </Tool>
            <Tool label="Delete row" onClick={() => chain().deleteRow().run()} className="text-xs">
              <span className="font-mono">−R</span>
            </Tool>
            <Tool label="Delete column" onClick={() => chain().deleteColumn().run()}>
              <span className="font-mono text-xs">−C</span>
            </Tool>
            <Tool label="Merge cells" disabled={!s.canMerge} onClick={() => chain().mergeCells().run()}>
              <TableCellsMerge />
            </Tool>
            <Tool label="Split cell" disabled={!s.canSplit} onClick={() => chain().splitCell().run()}>
              <TableCellsSplit />
            </Tool>
            <Tool label="Toggle header row" onClick={() => chain().toggleHeaderRow().run()}>
              <span className="font-mono text-xs">H</span>
            </Tool>
            <Tool label="Delete table" onClick={() => chain().deleteTable().run()} className="hover:text-danger">
              <X />
            </Tool>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />
      <Tool label="Comment" shortcut="⌥⌘M" disabled={!s.hasSelection} onClick={() => addComment(editor)}>
        <MessageSquarePlus />
      </Tool>
      <Tool label="Find and replace" shortcut="⌘F" onClick={() => openFind(editor)}>
        <Search />
      </Tool>
    </div>
  );
}

function SwatchPicker({
  label,
  icon,
  current,
  colors,
  onPick,
  renderSwatch,
}: {
  label: string;
  icon: React.ReactNode;
  current: string | null;
  colors: (string | null)[];
  onPick: (color: string | null) => void;
  renderSwatch: (color: string | null) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Tool label={label} active={open}>
          <span className="relative flex flex-col items-center">
            {icon}
            <span className="absolute -bottom-1 h-[3px] w-3.5 rounded-full" style={{ background: current ?? "transparent" }} />
          </span>
        </Tool>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={cn(menuContentClass, "min-w-0 p-2")} sideOffset={6} onCloseAutoFocus={(e) => e.preventDefault()}>
          <p className="mb-2 px-0.5 text-[11px] text-mute">{label}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {colors.map((color) => (
              <button
                key={color ?? "none"}
                onClick={() => {
                  onPick(color);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex size-7 items-center justify-center overflow-hidden rounded-md border border-line-strong bg-bg transition-transform hover:scale-110",
                  current === color && "ring-2 ring-accent",
                )}
                title={color ?? "Default"}
              >
                {renderSwatch(color)}
                {!color && <span className="absolute h-px w-9 rotate-45 bg-danger/70" />}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TableInsert({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ rows: 0, cols: 0 });
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Tool label="Table" active={open}>
          <Table />
        </Tool>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={cn(menuContentClass, "min-w-0 p-2.5")} sideOffset={6} onCloseAutoFocus={(e) => e.preventDefault()}>
          <div className="grid grid-cols-8 gap-1" onMouseLeave={() => setSize({ rows: 0, cols: 0 })}>
            {Array.from({ length: 48 }, (_, i) => {
              const row = Math.floor(i / 8) + 1;
              const col = (i % 8) + 1;
              const lit = row <= size.rows && col <= size.cols;
              return (
                <button
                  key={i}
                  onMouseEnter={() => setSize({ rows: row, cols: col })}
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: true }).run();
                    setOpen(false);
                  }}
                  className={cn("size-4 rounded-[3px] border transition-colors duration-75", lit ? "border-accent/80 bg-accent/25" : "border-line-strong bg-bg")}
                />
              );
            })}
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-mute">{size.rows ? `${size.cols} × ${size.rows}` : "Insert table"}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
