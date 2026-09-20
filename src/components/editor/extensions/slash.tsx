import { Extension, type Editor } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import { Heading1, Heading2, Heading3, Image as ImageIcon, Link2, List, ListOrdered, ListTodo, Minus, Pilcrow, Quote, SquareCode, Table, TextQuote } from "lucide-react";
import { paneOf, pickImage } from "@/lib/editorActions";
import { useUI } from "@/lib/store";
import { suggestionRender, type MenuItem } from "./suggestion";

interface SlashItem extends MenuItem {
  keywords: string;
  run: (editor: Editor) => void;
}

const ITEMS: SlashItem[] = [
  { id: "text", title: "Text", hint: "⌘⌥0", icon: <Pilcrow />, keywords: "paragraph plain", run: (e) => e.chain().focus().setParagraph().run() },
  { id: "h1", title: "Heading 1", hint: "#", icon: <Heading1 />, keywords: "title h1", run: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { id: "h2", title: "Heading 2", hint: "##", icon: <Heading2 />, keywords: "subtitle h2", run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: "h3", title: "Heading 3", hint: "###", icon: <Heading3 />, keywords: "h3", run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: "bullet", title: "Bulleted list", hint: "-", icon: <List />, keywords: "unordered ul", run: (e) => e.chain().focus().toggleBulletList().run() },
  { id: "ordered", title: "Numbered list", hint: "1.", icon: <ListOrdered />, keywords: "ordered ol", run: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: "todo", title: "Checklist", hint: "[ ]", icon: <ListTodo />, keywords: "todo task checkbox", run: (e) => e.chain().focus().toggleTaskList().run() },
  { id: "quote", title: "Quote", hint: ">", icon: <Quote />, keywords: "blockquote", run: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: "code", title: "Code block", hint: "```", icon: <SquareCode />, keywords: "pre fenced", run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: "divider", title: "Divider", hint: "---", icon: <Minus />, keywords: "hr rule separator", run: (e) => e.chain().focus().setHorizontalRule().run() },
  { id: "table", title: "Table", icon: <Table />, keywords: "grid", run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: "image", title: "Image", icon: <ImageIcon />, keywords: "picture photo upload", run: (e) => pickImage(e) },
  {
    id: "cite",
    title: "Citation",
    hint: "Footnote",
    icon: <TextQuote />,
    keywords: "reference source footnote cite",
    run: (e) => useUI.setState({ activePane: paneOf(e), dialog: { type: "cite" } }),
  },
  { id: "link", title: "Link to document", hint: "[[", icon: <Link2 />, keywords: "wiki backlink page", run: (e) => e.chain().focus().insertContent("[[").run() },
];

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        items: ({ query }) => {
          const q = query.toLowerCase();
          return ITEMS.filter((item) => item.title.toLowerCase().includes(q) || item.keywords.includes(q));
        },
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
        render: suggestionRender<SlashItem>(),
      }),
    ];
  },
});
