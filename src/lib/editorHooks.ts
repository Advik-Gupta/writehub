import { useEditorState, type Editor } from "@tiptap/react";
import { useEffect } from "react";
import { actions, useDoc } from "./api";
import { attachEditor } from "./save";
import { useUI } from "./store";
import { countWords } from "./utils";

export interface Heading {
  level: number;
  text: string;
  pos: number;
  key: string;
}

export interface DocStats {
  words: number;
  characters: number;
  paragraphs: number;
  headings: number;
  readingMinutes: number;
  pages: number;
}

const WORDS_PER_PAGE = 275;

export function useHeadings(editor: Editor | null | undefined): Heading[] {
  return (
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) => {
        if (!e || e.isDestroyed) return [];
        const list: Heading[] = [];
        e.state.doc.descendants((node, pos) => {
          if (node.type.name === "heading") {
            const text = node.textContent.trim();
            list.push({ level: node.attrs.level, text, pos, key: `${node.attrs.level}:${text.toLowerCase()}` });
          }
          return !node.isTextblock;
        });
        return list;
      },
    }) ?? []
  );
}

export function useDocStats(editor: Editor | null | undefined): DocStats | null {
  return useEditorState({
    editor: editor ?? null,
    selector: ({ editor: e }) => {
      if (!e || e.isDestroyed) return null;
      let paragraphs = 0;
      let headings = 0;
      let text = "";
      e.state.doc.descendants((node) => {
        if (node.isTextblock) {
          const content = node.textContent;
          if (content.trim()) {
            if (node.type.name === "heading") headings++;
            else if (node.type.name === "paragraph") paragraphs++;
            text += `${content}\n`;
          }
          return false;
        }
        return true;
      });
      const words = countWords(text);
      return {
        words,
        characters: e.storage.characterCount.characters(),
        paragraphs,
        headings,
        readingMinutes: Math.max(words ? 1 : 0, Math.round(words / 230)),
        pages: Math.round((words / WORDS_PER_PAGE) * 10) / 10,
      };
    },
  });
}

export function useCitations(editor: Editor | null | undefined) {
  return (
    useEditorState({
      editor: editor ?? null,
      selector: ({ editor: e }) => {
        if (!e || e.isDestroyed) return [];
        const list: { sourceId: string; quote: string; locator: string; pos: number }[] = [];
        e.state.doc.descendants((node, pos) => {
          if (node.type.name === "citation") list.push({ sourceId: node.attrs.sourceId, quote: node.attrs.quote, locator: node.attrs.locator, pos });
        });
        return list;
      },
    }) ?? []
  );
}

export function useEditorBinding(docId: string, pane: number, editor: Editor | null) {
  const registerEditor = useUI((s) => s.registerEditor);
  useEffect(() => {
    if (!editor) return;
    registerEditor(pane, editor);
    const detach = attachEditor(docId, editor);
    return () => {
      detach();
      if (useUI.getState().editors[pane] === editor) registerEditor(pane, undefined);
    };
  }, [docId, pane, editor, registerEditor]);
}

export function useGoal(docId: string | null, words: number) {
  const { data: doc } = useDoc(docId);
  const goal = doc?.wordGoal ?? null;
  return {
    goal,
    progress: goal ? words / goal : 0,
    setGoal: (value: number | null) => docId && actions.updateNode(docId, { wordGoal: value }),
  };
}
