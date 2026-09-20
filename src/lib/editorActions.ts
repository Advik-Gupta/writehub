"use client";

import type { EditorView } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";
import { actions } from "./api";
import { docIdOf } from "./save";
import { useUI } from "./store";
import { uid } from "./utils";

export function paneOf(editor: Editor) {
  const entry = Object.entries(useUI.getState().editors).find(([, candidate]) => candidate === editor);
  return entry ? Number(entry[0]) : useUI.getState().activePane;
}

export function openLinkEditor(editor: Editor) {
  useUI.setState({ linkEditorPane: paneOf(editor) });
  return true;
}

export function openFind(editor: Editor) {
  const pane = paneOf(editor);
  useUI.setState((state) => ({ findOpen: { ...state.findOpen, [pane]: true } }));
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-find-input="${pane}"]`)?.select());
  return true;
}

export async function addComment(editor: Editor) {
  const docId = docIdOf(editor);
  const { from, to, empty } = editor.state.selection;
  if (!docId || empty) return false;
  const id = uid();
  const quote = editor.state.doc.textBetween(from, to, " ");
  editor.chain().focus().setMark("comment", { id }).run();
  await actions.createComment({ id, docId, quote, body: "", resolved: false, createdAt: Date.now() });
  useUI.setState({ rightOpen: true, rightTab: "comments", focusCommentId: id });
  return true;
}

export function removeCommentMark(editor: Editor, commentId: string) {
  const { tr, doc, schema } = editor.state;
  doc.descendants((node, pos) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === "comment" && mark.attrs.id === commentId) tr.removeMark(pos, pos + node.nodeSize, schema.marks.comment.create({ id: commentId }));
    });
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

export function insertCitation(editor: Editor, attrs: { sourceId: string; quote: string; locator: string }) {
  const { from, to, empty } = editor.state.selection;
  editor
    .chain()
    .focus()
    .insertContentAt(empty ? from : to, { type: "citation", attrs })
    .run();
}

export function insertImageFiles(view: EditorView, files: File[], pos?: number) {
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (!images.length) return false;
  images.forEach(async (file) => {
    const src = await actions.uploadImage(file);
    const node = view.state.schema.nodes.image.create({ src, alt: file.name.replace(/\.[^.]+$/, "") });
    const at = pos ?? view.state.selection.from;
    view.dispatch(view.state.tr.insert(Math.min(at, view.state.doc.content.size), node));
  });
  return true;
}

export function pickImage(editor: Editor) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = () => insertImageFiles(editor.view, [...(input.files ?? [])]);
  input.click();
}
