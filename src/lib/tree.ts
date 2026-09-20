import { useMemo } from "react";
import { actions, keys, useTree } from "./api";
import { queryClient } from "./queryClient";
import { useUI } from "./store";
import type { FolderRole, Tree, TreeNode } from "./types";

export type TreeIndex = ReturnType<typeof buildIndex>;

export function buildIndex(tree: Tree | undefined) {
  const nodes = tree?.nodes ?? [];
  const projects = tree?.projects ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, TreeNode[]>();
  for (const n of nodes) if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  children.forEach((list) => list.sort((a, b) => a.position - b.position));

  const childrenOf = (id: string) => children.get(id) ?? [];

  const ancestors = (id: string) => {
    const list: TreeNode[] = [];
    let current = byId.get(id)?.parentId;
    while (current) {
      const node = byId.get(current);
      if (!node) break;
      list.unshift(node);
      current = node.parentId;
    }
    return list;
  };

  const isTrashed = (id: string) => byId.get(id)?.role === "trash" || ancestors(id).some((a) => a.role === "trash");
  const roleFolder = (projectId: string, role: FolderRole) => nodes.find((n) => n.projectId === projectId && n.role === role);
  const rootsOf = (projectId: string) => nodes.filter((n) => n.projectId === projectId && !n.parentId).sort((a, b) => a.position - b.position);
  const docsUnder = (folderId: string): TreeNode[] => childrenOf(folderId).flatMap((c) => (c.kind === "document" ? [c] : docsUnder(c.id)));
  const project = (projectId: string) => projects.find((p) => p.id === projectId);
  const recentDocs = (limit: number) =>
    nodes
      .filter((n) => n.kind === "document" && !isTrashed(n.id))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);

  return { nodes, projects, byId, childrenOf, ancestors, isTrashed, roleFolder, rootsOf, docsUnder, project, recentDocs };
}

export function useTreeIndex() {
  const { data } = useTree();
  return useMemo(() => buildIndex(data), [data]);
}

export const lastDocByPane = new Map<number, string>();

export function currentFolderId() {
  const ui = useUI.getState();
  const index = buildIndex(queryClient.getQueryData<Tree>(keys.tree));
  const pane = ui.panes[ui.activePane];
  if (pane?.kind === "board" && !index.isTrashed(pane.folderId)) return pane.folderId;
  if (pane?.kind === "doc") {
    const node = index.byId.get(pane.id);
    if (node?.parentId && !index.isTrashed(node.id)) return node.parentId;
  }
  const project = index.projects[0];
  return project ? index.roleFolder(project.id, "manuscript")?.id : undefined;
}

export async function createDocument(folderId = currentFolderId(), pane?: number) {
  if (!folderId) return;
  const node = await actions.createNode(folderId, "document", "");
  const ui = useUI.getState();
  ui.toggleExpanded(folderId, true);
  ui.openDoc(node.id, pane);
  return node;
}

export async function createFolder(parentId: string) {
  const node = await actions.createNode(parentId, "folder", "New folder");
  useUI.getState().toggleExpanded(parentId, true);
  useUI.setState({ renamingId: node.id });
  return node;
}

export function purgeFromPanes(id: string) {
  queryClient.removeQueries({ queryKey: keys.doc(id) });
  useUI.setState((s) => ({ panes: s.panes.map((p) => (p && ((p.kind === "doc" && p.id === id) || (p.kind === "board" && p.folderId === id)) ? null : p)) }));
}
