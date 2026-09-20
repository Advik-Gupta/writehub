import { mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import { FilePlus, FileText } from "lucide-react";
import { actions, keys } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { docIdOf } from "@/lib/save";
import { useUI } from "@/lib/store";
import type { Tree } from "@/lib/types";
import { suggestionRender, type MenuItem } from "./suggestion";

const tree = () => queryClient.getQueryData<Tree>(keys.tree);

function titleOf(id: string) {
  const t = tree();
  if (!t) return null;
  const node = t.nodes.find((n) => n.id === id);
  return node ? node.title || "Untitled" : undefined;
}

function trashIds(t: Tree) {
  const trash = new Set(t.nodes.filter((n) => n.role === "trash").map((n) => n.id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of t.nodes) if (n.parentId && trash.has(n.parentId) && !trash.has(n.id)) grew = trash.add(n.id) && true;
  }
  return trash;
}

export function openLinkedDoc(id: string, otherPane: boolean) {
  const ui = useUI.getState();
  if (otherPane && ui.panes.length > 1) ui.openDoc(id, ui.activePane === 0 ? 1 : 0);
  else ui.openDoc(id);
}

export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: null, parseHTML: (el) => el.getAttribute("data-wiki"), renderHTML: (a) => ({ "data-wiki": a.id }) },
      label: { default: "", parseHTML: (el) => el.textContent ?? "", renderHTML: () => ({}) },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wiki]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "wikilink" }), node.attrs.label];
  },

  renderText({ node }) {
    return titleOf(node.attrs.id) ?? node.attrs.label;
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.className = "wikilink";
      let current = node;
      const paint = () => {
        const title = titleOf(current.attrs.id);
        dom.textContent = title ?? current.attrs.label ?? "Untitled";
        dom.classList.toggle("broken", title === undefined);
      };
      paint();
      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        if (event.type === "updated" && event.query.queryKey[0] === "tree") paint();
      });
      return {
        dom,
        update: (next) => {
          if (next.type !== current.type) return false;
          current = next;
          paint();
          return true;
        },
        destroy: unsubscribe,
      };
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("wikiLinkClick"),
        props: {
          handleClickOn: (_view, _pos, node, _nodePos, event) => {
            if (node.type.name !== "wikiLink" || titleOf(node.attrs.id) === undefined) return false;
            openLinkedDoc(node.attrs.id, event.altKey);
            return true;
          },
        },
      }),
      Suggestion<MenuItem, MenuItem>({
        editor,
        pluginKey: new PluginKey("wikiLinkSuggestion"),
        char: "[[",
        allowSpaces: true,
        allowedPrefixes: null,
        items: ({ query }) => {
          const t = tree();
          if (!t) return [];
          const trashed = trashIds(t);
          const currentId = docIdOf(editor);
          const q = query.toLowerCase().replace(/\]+$/, "");
          const docs = t.nodes
            .filter((n) => n.kind === "document" && !trashed.has(n.id) && n.id !== currentId && (n.title || "untitled").toLowerCase().includes(q))
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 8)
            .map((n): MenuItem => ({
              id: n.id,
              title: n.title || "Untitled",
              hint: t.projects.find((p) => p.id === n.projectId)?.title,
              icon: <FileText />,
            }));
          const exact = docs.some((d) => d.title.toLowerCase() === q);
          return q && !exact ? [...docs, { id: "__create", title: `Create “${query.replace(/\]+$/, "")}”`, hint: "New document", icon: <FilePlus /> }] : docs;
        },
        command: async ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          let id = props.id;
          let label = props.title;
          if (id === "__create") {
            const t = tree();
            const currentId = docIdOf(editor);
            const projectId = t?.nodes.find((n) => n.id === currentId)?.projectId ?? t?.projects[0]?.id;
            const manuscript = t?.nodes.find((n) => n.projectId === projectId && n.role === "manuscript");
            if (!manuscript) return;
            label = props.title.slice(8, -1);
            id = (await actions.createNode(manuscript.id, "document", label)).id;
          }
          editor.chain().focus().insertContent([{ type: "wikiLink", attrs: { id, label } }, { type: "text", text: " " }]).run();
        },
        render: suggestionRender(),
      }),
    ];
  },
});
