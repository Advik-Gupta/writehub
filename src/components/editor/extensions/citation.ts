import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const dataAttr = (name: string, key: string) => ({
  default: "",
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? "",
  renderHTML: (attrs: Record<string, string>) => ({ [`data-${name}`]: attrs[key] }),
});

function numberCitations(doc: PMNode) {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "citation") {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { "data-n": String(decorations.length + 1) }));
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      sourceId: dataAttr("source-id", "sourceId"),
      quote: dataAttr("quote", "quote"),
      locator: dataAttr("locator", "locator"),
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-citation]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes, { "data-citation": "", class: "citation" })];
  },

  renderText() {
    return "";
  },

  addProseMirrorPlugins() {
    const key = new PluginKey<DecorationSet>("citationNumbers");
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_, { doc }) => numberCitations(doc),
          apply: (tr, old) => (tr.docChanged ? numberCitations(tr.doc) : old),
        },
        props: {
          decorations: (state) => key.getState(state),
        },
      }),
    ];
  },
});
