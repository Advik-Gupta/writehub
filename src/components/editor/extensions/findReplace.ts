import { Extension, type Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface Match {
  from: number;
  to: number;
}

interface FindState {
  query: string;
  caseSensitive: boolean;
  matches: Match[];
  index: number;
}

const findKey = new PluginKey<FindState>("findReplace");

function search(doc: PMNode, query: string, caseSensitive: boolean) {
  const matches: Match[] = [];
  if (!query) return matches;
  const needle = caseSensitive ? query : query.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    const map: number[] = [];
    node.forEach((child, offset) => {
      if (child.isText) {
        for (let i = 0; i < child.text!.length; i++) map.push(pos + 1 + offset + i);
        text += child.text;
      } else {
        map.push(-1);
        text += "￼";
      }
    });
    const haystack = caseSensitive ? text : text.toLowerCase();
    for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) {
      const slice = map.slice(i, i + needle.length);
      if (!slice.includes(-1)) matches.push({ from: slice[0], to: slice[slice.length - 1] + 1 });
    }
    return false;
  });
  return matches;
}

export const FindReplace = Extension.create({
  name: "findReplace",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => ({ query: "", caseSensitive: false, matches: [], index: 0 }),
          apply: (tr, prev) => {
            const meta = tr.getMeta(findKey) as Partial<FindState> | undefined;
            if (!meta && !tr.docChanged) return prev;
            const next = { ...prev, ...meta };
            const matches = meta?.query !== undefined || meta?.caseSensitive !== undefined || tr.docChanged ? search(tr.doc, next.query, next.caseSensitive) : prev.matches;
            return { ...next, matches, index: matches.length ? Math.min(next.index, matches.length - 1) : 0 };
          },
        },
        props: {
          decorations(state) {
            const { matches, index } = findKey.getState(state)!;
            if (!matches.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === index ? "find-match current" : "find-match" })),
            );
          },
        },
      }),
    ];
  },
});

export const getFindState = (state: EditorState) => findKey.getState(state)!;

function reveal(editor: Editor, index: number) {
  const match = getFindState(editor.state).matches[index];
  const tr = editor.state.tr.setMeta(findKey, { index });
  if (match) tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView();
  editor.view.dispatch(tr);
}

export function setFind(editor: Editor, patch: { query?: string; caseSensitive?: boolean }) {
  const { from } = editor.state.selection;
  editor.view.dispatch(editor.state.tr.setMeta(findKey, { ...patch, index: 0 }));
  const { matches } = getFindState(editor.state);
  const first = matches.findIndex((m) => m.from >= from);
  if (matches.length) reveal(editor, first === -1 ? 0 : first);
}

export function findStep(editor: Editor, direction: 1 | -1) {
  const { matches, index } = getFindState(editor.state);
  if (matches.length) reveal(editor, (index + direction + matches.length) % matches.length);
}

export function replaceCurrent(editor: Editor, replacement: string) {
  const { matches, index } = getFindState(editor.state);
  const match = matches[index];
  if (!match) return;
  editor.view.dispatch(editor.state.tr.insertText(replacement, match.from, match.to));
  if (getFindState(editor.state).matches.length) reveal(editor, index);
}

export function replaceAll(editor: Editor, replacement: string) {
  const { matches } = getFindState(editor.state);
  if (!matches.length) return;
  const tr = editor.state.tr;
  [...matches].reverse().forEach((m) => tr.insertText(replacement, m.from, m.to));
  editor.view.dispatch(tr);
}
