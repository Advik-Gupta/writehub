"use client";

import type { JSONContent } from "@tiptap/core";
import { actions, saveContent } from "./api";
import { APP_NAME } from "./config";
import { useUI } from "./store";

const text = (value: string, marks?: JSONContent["marks"]): JSONContent => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const heading = (level: number, value: string): JSONContent => ({ type: "heading", attrs: { level }, content: [text(value)] });
const code = (value: string) => text(value, [{ type: "code" }]);

const welcome: JSONContent = {
  type: "doc",
  content: [
    paragraph(
      text("This is a place to think out loud. Everything you write is encrypted on this device before it is saved, so "),
      text(APP_NAME, [{ type: "bold" }]),
      text(" stores your work without being able to read it."),
    ),
    heading(2, "Getting around"),
    {
      type: "bulletList",
      content: [
        ["Type ", "/", " for blocks: tables, checklists, citations, links to other documents."],
        ["Type ", "[[", " to link another document. Backlinks show up in the Links panel."],
        ["Write ", "#tags", " anywhere. Browse them from the tag icon in the left rail."],
        ["Press ", "⌘P", " to search every project, source and tag."],
      ].map(([before, token, after]) => ({ type: "listItem", content: [paragraph(text(before), code(token), text(after))] })),
    },
    heading(2, "Writing long things"),
    paragraph(
      text("Split a book into chapter documents inside "),
      text("Manuscript", [{ type: "bold" }]),
      text(", rearrange them on the corkboard, then compile them into a single manuscript. Keep notes in "),
      text("Research", [{ type: "bold" }]),
      text("."),
    ),
    {
      type: "taskList",
      content: ["Set a word goal in Insights", "Add a source in References", "Open two documents side by side"].map((item) => ({
        type: "taskItem",
        attrs: { checked: false },
        content: [paragraph(text(item))],
      })),
    },
    paragraph(text("#welcome")),
  ],
};

export async function seedWorkspace() {
  const projectId = await actions.createProject("My Writing");
  const { loadTree, keys } = await import("./api");
  const { queryClient } = await import("./queryClient");
  const tree = await queryClient.ensureQueryData({ queryKey: keys.tree, queryFn: loadTree });
  const manuscript = tree.nodes.find((node) => node.projectId === projectId && node.role === "manuscript");
  if (!manuscript) return;
  const doc = await actions.createNode(manuscript.id, "document", "Welcome");
  await saveContent(doc.id, welcome);
  const ui = useUI.getState();
  ui.toggleExpanded(manuscript.id, true);
  ui.openDoc(doc.id);
}
