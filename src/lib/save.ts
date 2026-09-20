"use client";

import type { JSONContent } from "@tiptap/core";
import { Step } from "@tiptap/pm/transform";
import type { Editor } from "@tiptap/react";
import { saveContent } from "./api";
import { useUI } from "./store";

export const SYNC_META = "paneSync";
const SAVE_DELAY = 700;

const groups = new Map<string, Set<Editor>>();
const docByEditor = new WeakMap<Editor, string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const queues = new Map<string, Promise<void>>();

export const docIdOf = (editor: Editor) => docByEditor.get(editor) ?? null;

export function liveContent(docId: string): JSONContent | undefined {
  const editor = groups.get(docId)?.values().next().value;
  return editor && !editor.isDestroyed ? editor.getJSON() : undefined;
}

export function attachEditor(docId: string, editor: Editor) {
  const group = groups.get(docId) ?? new Set<Editor>();
  groups.set(docId, group);
  group.add(editor);
  docByEditor.set(editor, docId);

  const forward = ({ transaction, appendedTransactions }: { transaction: Editor["state"]["tr"]; appendedTransactions: Editor["state"]["tr"][] }) => {
    if (transaction.getMeta(SYNC_META)) return;
    const steps = [transaction, ...appendedTransactions].flatMap((entry) => entry.steps.map((step) => step.toJSON()));
    if (!steps.length) return;
    for (const other of group) {
      if (other === editor || other.isDestroyed) continue;
      const tr = other.state.tr;
      steps.forEach((json) => tr.step(Step.fromJSON(other.schema, json)));
      tr.setMeta(SYNC_META, true).setMeta("addToHistory", false);
      other.view.dispatch(tr);
    }
  };
  editor.on("transaction", forward);

  return () => {
    editor.off("transaction", forward);
    group.delete(editor);
    if (!group.size) groups.delete(docId);
    if (timers.has(docId) && !group.size) {
      clearTimeout(timers.get(docId));
      timers.delete(docId);
      enqueue(docId, editor.getJSON());
    }
  };
}

export function scheduleSave(docId: string) {
  useUI.getState().setSaveState(docId, "dirty");
  clearTimeout(timers.get(docId));
  timers.set(
    docId,
    setTimeout(() => flushSave(docId), SAVE_DELAY),
  );
}

export function flushSave(docId: string) {
  clearTimeout(timers.get(docId));
  timers.delete(docId);
  const content = liveContent(docId);
  if (content) enqueue(docId, content);
}

function enqueue(docId: string, content: JSONContent) {
  const run = async () => {
    const { setSaveState } = useUI.getState();
    setSaveState(docId, "saving");
    try {
      await saveContent(docId, content);
      if (!timers.has(docId)) setSaveState(docId, "saved");
    } catch {
      setSaveState(docId, "error");
    }
  };
  const next = (queues.get(docId) ?? Promise.resolve()).then(run);
  queues.set(docId, next);
  return next;
}

export function pendingSaves() {
  return [...timers.keys()];
}

export function flushAllOnExit() {
  for (const docId of [...timers.keys()]) flushSave(docId);
}
