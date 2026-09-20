import type { Editor } from "@tiptap/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaneContent = { kind: "doc"; id: string } | { kind: "board"; folderId: string } | null;
export type LeftView = "binder" | "outline" | "tags";
export type RightTab = "insights" | "references" | "info" | "comments" | "links";
export type StatsMode = "words" | "full" | "off";
export type EditorFont = "mono" | "sans" | "serif";
export type SaveState = "dirty" | "saving" | "saved" | "error";

export type DialogState =
  | null
  | { type: "palette" }
  | { type: "compile"; folderId?: string }
  | { type: "share"; docId: string }
  | { type: "source"; sourceId?: string; attachTo?: string }
  | { type: "cite"; sourceId?: string }
  | { type: "references"; docId: string }
  | { type: "settings" };

interface UIState {
  panes: PaneContent[];
  activePane: number;
  leftOpen: boolean;
  leftView: LeftView;
  rightOpen: boolean;
  rightTab: RightTab;
  expanded: Record<string, boolean>;
  statsMode: StatsMode;
  showToolbar: boolean;
  editorFont: EditorFont;
  dialog: DialogState;
  activeTag: string | null;
  focusCommentId: string | null;
  renamingId: string | null;
  findOpen: Record<number, boolean>;
  linkEditorPane: number | null;
  saveState: Record<string, SaveState>;
  editors: Record<number, Editor | undefined>;

  openDoc: (id: string, pane?: number) => void;
  openBoard: (folderId: string, pane?: number) => void;
  toggleSplit: () => void;
  closePane: (index: number) => void;
  showLeft: (view: LeftView) => void;
  showRight: (tab: RightTab) => void;
  toggleExpanded: (id: string, value?: boolean) => void;
  setSaveState: (docId: string, state: SaveState) => void;
  registerEditor: (pane: number, editor: Editor | undefined) => void;
  openDialog: (dialog: DialogState) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      panes: [null],
      activePane: 0,
      leftOpen: true,
      leftView: "binder",
      rightOpen: true,
      rightTab: "insights",
      expanded: {},
      statsMode: "full",
      showToolbar: true,
      editorFont: "mono",
      dialog: null,
      activeTag: null,
      focusCommentId: null,
      renamingId: null,
      findOpen: {},
      linkEditorPane: null,
      saveState: {},
      editors: {},

      openDoc: (id, pane = get().activePane) =>
        set((s) => ({ panes: s.panes.map((p, i) => (i === pane ? { kind: "doc", id } : p)), activePane: pane })),
      openBoard: (folderId, pane = get().activePane) =>
        set((s) => ({ panes: s.panes.map((p, i) => (i === pane ? { kind: "board", folderId } : p)), activePane: pane })),
      toggleSplit: () =>
        set((s) => (s.panes.length > 1 ? { panes: [s.panes[s.activePane]], activePane: 0 } : { panes: [s.panes[0], s.panes[0]], activePane: 1 })),
      closePane: (index) => set((s) => ({ panes: s.panes.length > 1 ? s.panes.filter((_, i) => i !== index) : [null], activePane: 0 })),
      showLeft: (view) => set((s) => ({ leftView: view, leftOpen: s.leftView === view ? !s.leftOpen : true })),
      showRight: (tab) => set((s) => ({ rightTab: tab, rightOpen: s.rightTab === tab ? !s.rightOpen : true })),
      toggleExpanded: (id, value) => set((s) => ({ expanded: { ...s.expanded, [id]: value ?? !s.expanded[id] } })),
      setSaveState: (docId, state) => set((s) => ({ saveState: { ...s.saveState, [docId]: state } })),
      registerEditor: (pane, editor) => set((s) => ({ editors: { ...s.editors, [pane]: editor } })),
      openDialog: (dialog) => set({ dialog }),
    }),
    {
      name: "writing-ui",
      partialize: (s) => ({
        panes: s.panes,
        activePane: s.activePane,
        leftOpen: s.leftOpen,
        leftView: s.leftView,
        rightOpen: s.rightOpen,
        rightTab: s.rightTab,
        expanded: s.expanded,
        statsMode: s.statsMode,
        showToolbar: s.showToolbar,
        editorFont: s.editorFont,
      }),
    },
  ),
);

export const useActivePane = () => useUI((s) => s.panes[s.activePane] ?? null);
export const useActiveDocId = () => useUI((s) => {
  const pane = s.panes[s.activePane];
  return pane?.kind === "doc" ? pane.id : null;
});
export const useActiveEditor = () => useUI((s) => s.editors[s.activePane]);
