import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { Citation } from "./citation";
import { CommentMark } from "./comment";
import { FindReplace } from "./findReplace";
import { ResizableImage } from "./image";
import { Shortcuts } from "./shortcuts";
import { SlashCommand } from "./slash";
import { Tags } from "./tags";
import { WikiLink } from "./wikiLink";

export function buildExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      dropcursor: { color: "#38d9a9", width: 2 },
      undoRedo: { depth: 1000, newGroupDelay: 500 },
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: true } }),
    CharacterCount,
    Placeholder.configure({
      placeholder: ({ node }) => (node.type.name === "heading" ? `Heading ${node.attrs.level}` : "Write something, or press / for commands…"),
    }),
    ResizableImage,
    Citation,
    WikiLink,
    CommentMark,
    Tags,
    FindReplace,
    SlashCommand,
    Shortcuts,
  ];
}
