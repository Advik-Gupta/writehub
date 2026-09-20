import { Extension } from "@tiptap/core";
import { addComment, openFind, openLinkEditor } from "@/lib/editorActions";
import { docIdOf, flushSave } from "@/lib/save";

export const Shortcuts = Extension.create({
  name: "appShortcuts",

  addKeyboardShortcuts() {
    const editor = this.editor;
    return {
      "Mod-k": () => openLinkEditor(editor),
      "Mod-f": () => openFind(editor),
      "Mod-Shift-h": () => openFind(editor),
      "Mod-Alt-m": () => {
        addComment(editor);
        return true;
      },
      "Mod-s": () => {
        const id = docIdOf(editor);
        if (id) flushSave(id);
        return true;
      },
      "Mod-Alt-0": () => editor.chain().focus().setParagraph().run(),
      "Mod-Alt-1": () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      "Mod-Alt-2": () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      "Mod-Alt-3": () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      "Mod-\\": () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
    };
  },
});
