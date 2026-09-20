import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import Suggestion from "@tiptap/suggestion";
import { Hash } from "lucide-react";
import { keys } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { TAG_PATTERN } from "@/lib/serialize";
import { useUI } from "@/lib/store";
import type { Tree } from "@/lib/types";
import { suggestionRender, type MenuItem } from "./suggestion";

function tagDecorations(doc: PMNode) {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText || parent?.type.spec.code || node.marks.some((m) => m.type.name === "code")) return;
    for (const match of node.text!.matchAll(TAG_PATTERN)) {
      const from = pos + match.index! + match[1].length;
      decorations.push(Decoration.inline(from, from + match[2].length + 1, { class: "tag-chip", "data-tag": match[2].toLowerCase(), title: "⌘-click to browse tag" }));
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const Tags = Extension.create({
  name: "tags",

  addProseMirrorPlugins() {
    const key = new PluginKey<DecorationSet>("tagHighlight");
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_, { doc }) => tagDecorations(doc),
          apply: (tr, old) => (tr.docChanged ? tagDecorations(tr.doc) : old),
        },
        props: {
          decorations: (state) => key.getState(state),
          handleClick: (_view, _pos, event) => {
            const tag = (event.target as HTMLElement).closest<HTMLElement>("[data-tag]")?.dataset.tag;
            if (!tag || !(event.metaKey || event.ctrlKey)) return false;
            useUI.setState({ activeTag: tag, leftOpen: true, leftView: "tags" });
            return true;
          },
        },
      }),
      Suggestion<MenuItem, MenuItem>({
        editor: this.editor,
        pluginKey: new PluginKey("tagSuggestion"),
        char: "#",
        minQueryLength: 1,
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        items: ({ query }) => {
          const q = query.toLowerCase();
          const tree = queryClient.getQueryData<Tree>(keys.tree);
          const counts = new Map<string, number>();
          Object.values(tree?.indexes ?? {}).forEach((entry) => entry.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
          return [...counts.entries()]
            .filter(([tag]) => tag.startsWith(q) && tag !== q)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([tag, count]) => ({ id: tag, title: tag, hint: String(count), icon: <Hash /> }));
        },
        command: ({ editor, range, props }) => {
          editor.chain().focus().insertContentAt(range, `#${props.id} `).run();
        },
        render: suggestionRender(),
      }),
    ];
  },
});
