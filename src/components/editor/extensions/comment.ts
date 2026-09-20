import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { useUI } from "@/lib/store";

export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,
  excludes: "",

  addAttributes() {
    return {
      id: { default: null, parseHTML: (el) => el.getAttribute("data-comment"), renderHTML: (a) => ({ "data-comment": a.id }) },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "comment-mark" }), 0];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("commentFocus"),
        props: {
          handleClick: (view, pos) => {
            const mark = view.state.doc
              .resolve(pos)
              .marks()
              .find((m) => m.type.name === "comment");
            if (mark) useUI.setState({ focusCommentId: mark.attrs.id });
            return false;
          },
        },
      }),
    ];
  },
});
