"use client";

import type { JSONContent } from "@tiptap/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { uploadAsset } from "./assets";
import { decryptJson, encryptJson } from "./crypto";
import { queryClient } from "./queryClient";
import { dataKey } from "./session";
import { extractCitations, extractTags, extractWikiLinks, indexText } from "./serialize";
import {
  DEFAULT_SETTINGS,
  emptyMeta,
  type Collection,
  type Comment,
  type DocIndex,
  type DocLinks,
  type DocRecord,
  type DocSource,
  type Encrypted,
  type LinkRef,
  type NodeMeta,
  type SearchResults,
  type Settings,
  type Source,
  type SourceInput,
  type TagCount,
  type Tree,
  type TreeNode,
} from "./types";
import { countWords } from "./utils";

interface WireNode {
  id: string;
  projectId: string;
  parentId: string | null;
  kind: "folder" | "document";
  role: TreeNode["role"];
  position: number;
  meta: Encrypted;
  index: Encrypted | null;
  shareSlug: string | null;
  createdAt: number;
  updatedAt: number;
}

interface WireRecord {
  id: string;
  docId?: string;
  data: Encrypted;
  createdAt: number;
}

async function request<T>(url: string, method = "GET", payload?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: payload === undefined ? undefined : { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, payload: unknown = {}) => request<T>(url, "POST", payload),
  patch: <T>(url: string, payload: unknown) => request<T>(url, "PATCH", payload),
  del: <T>(url: string, payload: unknown = {}) => request<T>(url, "DELETE", payload),
};

export const keys = {
  tree: ["workspace"] as const,
  doc: (id: string) => ["doc", id] as const,
  comments: (id: string) => ["comments", id] as const,
  sources: ["sources"] as const,
  collections: ["collections"] as const,
  settings: ["settings"] as const,
};

const encrypt = <T>(value: T) => encryptJson(dataKey(), value);
const decrypt = <T>(blob: Encrypted) => decryptJson<T>(dataKey(), blob);

const pickMeta = (node: NodeMeta): NodeMeta => ({
  title: node.title,
  synopsis: node.synopsis,
  status: node.status,
  starred: node.starred,
  wordCount: node.wordCount,
  wordGoal: node.wordGoal,
  outline: node.outline,
  manualSources: node.manualSources,
});

const toTreeNode = (wire: WireNode, meta: NodeMeta): TreeNode => ({
  ...meta,
  id: wire.id,
  projectId: wire.projectId,
  parentId: wire.parentId,
  kind: wire.kind,
  role: wire.role,
  position: wire.position,
  shareSlug: wire.shareSlug,
  createdAt: wire.createdAt,
  updatedAt: wire.updatedAt,
});

export async function loadTree(): Promise<Tree> {
  const wire = await api.get<{ projects: { id: string; position: number; meta: Encrypted; createdAt: number }[]; nodes: WireNode[] }>("/api/workspace");
  const projects = await Promise.all(
    wire.projects.map(async (project) => ({
      id: project.id,
      position: project.position,
      createdAt: project.createdAt,
      title: (await decrypt<{ title: string }>(project.meta)).title,
    })),
  );
  const metas: Record<string, NodeMeta> = {};
  const indexes: Record<string, DocIndex> = {};
  const nodes = await Promise.all(
    wire.nodes.map(async (node) => {
      const meta = { ...emptyMeta(), ...(await decrypt<NodeMeta>(node.meta)) };
      metas[node.id] = meta;
      if (node.index) indexes[node.id] = await decrypt<DocIndex>(node.index);
      return toTreeNode(node, meta);
    }),
  );
  return { projects: projects.sort((a, b) => a.position - b.position), nodes, metas, indexes };
}

export async function loadDoc(id: string): Promise<DocRecord> {
  const wire = await api.get<WireNode & { content: Encrypted | null }>(`/api/nodes/${id}`);
  const meta = { ...emptyMeta(), ...(await decrypt<NodeMeta>(wire.meta)) };
  return { ...toTreeNode(wire, meta), content: wire.content ? await decrypt<JSONContent>(wire.content) : null };
}

export async function loadSources(): Promise<Source[]> {
  const records = await api.get<WireRecord[]>("/api/sources");
  return Promise.all(records.map(async (record) => ({ ...(await decrypt<SourceInput>(record.data)), id: record.id, createdAt: record.createdAt })));
}

export async function loadCollections(): Promise<Collection[]> {
  const records = await api.get<WireRecord[]>("/api/collections");
  return Promise.all(
    records.map(async (record) => {
      const data = await decrypt<{ title: string; sourceIds: string[] }>(record.data);
      return { id: record.id, title: data.title, sourceIds: data.sourceIds ?? [], createdAt: record.createdAt };
    }),
  );
}

export async function loadComments(docId: string): Promise<Comment[]> {
  const records = await api.get<WireRecord[]>(`/api/nodes/${docId}/comments`);
  return Promise.all(
    records.map(async (record) => ({ ...(await decrypt<Omit<Comment, "id" | "docId">>(record.data)), id: record.id, docId }))
  );
}

export async function loadSettings(): Promise<Settings> {
  const { settings } = await api.get<{ settings: Encrypted | null }>("/api/settings");
  return settings ? { ...DEFAULT_SETTINGS, ...(await decrypt<Settings>(settings)) } : DEFAULT_SETTINGS;
}

export const useTree = () => useQuery({ queryKey: keys.tree, queryFn: loadTree, staleTime: Infinity });
export const useDoc = (id: string | null) => useQuery({ queryKey: keys.doc(id ?? ""), queryFn: () => loadDoc(id as string), enabled: !!id, staleTime: Infinity });
export const useComments = (id: string | null) => useQuery({ queryKey: keys.comments(id ?? ""), queryFn: () => loadComments(id as string), enabled: !!id });
export const useSources = () => useQuery({ queryKey: keys.sources, queryFn: loadSources, staleTime: Infinity });
export const useCollections = () => useQuery({ queryKey: keys.collections, queryFn: loadCollections, staleTime: Infinity });
export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: loadSettings, staleTime: Infinity });

function reference(tree: Tree, id: string): LinkRef | null {
  const node = tree.nodes.find((entry) => entry.id === id);
  if (!node) return null;
  return { id: node.id, title: node.title || "Untitled", projectTitle: tree.projects.find((project) => project.id === node.projectId)?.title ?? "" };
}

export function useLinks(docId: string | null) {
  const { data: tree } = useTree();
  return useMemo(() => {
    if (!tree || !docId) return { data: undefined as DocLinks | undefined };
    const index = tree.indexes[docId];
    const backlinks = tree.nodes.filter((node) => tree.indexes[node.id]?.links.includes(docId)).map((node) => reference(tree, node.id)!);
    const outgoing = (index?.links ?? []).map((id) => reference(tree, id)).filter((entry): entry is LinkRef => !!entry);
    return { data: { backlinks, outgoing, tags: index?.tags ?? [] } };
  }, [tree, docId]);
}

export function useDocSources(docId: string | null) {
  const { data: tree } = useTree();
  return useMemo(() => {
    if (!tree || !docId) return { data: undefined as DocSource[] | undefined };
    const cited = new Set(tree.indexes[docId]?.citations ?? []);
    const manual = new Set(tree.metas[docId]?.manualSources ?? []);
    return { data: [...new Set([...cited, ...manual])].map((sourceId) => ({ sourceId, cited: cited.has(sourceId), manual: manual.has(sourceId) })) };
  }, [tree, docId]);
}

export function useTags() {
  const { data: tree } = useTree();
  return useMemo(() => {
    if (!tree) return { data: undefined as TagCount[] | undefined };
    const counts = new Map<string, number>();
    Object.values(tree.indexes).forEach((index) => index.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return { data: [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)) };
  }, [tree]);
}

export function useTagDocs(tag: string | null) {
  const { data: tree } = useTree();
  return useMemo(() => {
    if (!tree || !tag) return { data: undefined as LinkRef[] | undefined };
    return { data: tree.nodes.filter((node) => tree.indexes[node.id]?.tags.includes(tag)).map((node) => reference(tree, node.id)!) };
  }, [tree, tag]);
}

function snippetAround(text: string, at: number, length: number) {
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + length + 70);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, at)}\u0001${text.slice(at, at + length)}\u0002${text.slice(at + length, end)}${suffix}`.replace(/\s+/g, " ");
}

export function useSearch(query: string) {
  const { data: tree } = useTree();
  const { data: sources } = useSources();
  return useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || !tree) return { data: undefined as SearchResults | undefined };
    const documents = tree.nodes
      .filter((node) => node.kind === "document")
      .map((node) => {
        const index = tree.indexes[node.id];
        const text = index?.text ?? "";
        const at = text.toLowerCase().indexOf(needle);
        const titleMatch = node.title.toLowerCase().includes(needle);
        if (!titleMatch && at === -1) return null;
        return { ...reference(tree, node.id)!, snippet: at === -1 ? "" : snippetAround(text, at, needle.length), updatedAt: node.updatedAt };
      })
      .filter((entry): entry is LinkRef & { snippet: string; updatedAt: number } => !!entry)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);
    const matchedSources = (sources ?? []).filter((source) => [source.title, source.authors, source.container].some((field) => field.toLowerCase().includes(needle))).slice(0, 8);
    const tags = [...new Set(Object.values(tree.indexes).flatMap((index) => index.tags))].filter((tag) => tag.includes(needle.replace(/^#/, ""))).slice(0, 8);
    return { data: { documents, sources: matchedSources, tags } };
  }, [query, tree, sources]);
}

function patchTree(update: (tree: Tree) => Tree) {
  queryClient.setQueryData<Tree>(keys.tree, (tree) => (tree ? update(tree) : tree));
}

export function applyMeta(id: string, meta: NodeMeta) {
  const updatedAt = Date.now();
  patchTree((tree) => ({
    ...tree,
    metas: { ...tree.metas, [id]: meta },
    nodes: tree.nodes.map((node) => (node.id === id ? { ...node, ...meta, updatedAt } : node)),
  }));
  queryClient.setQueryData<DocRecord>(keys.doc(id), (doc) => doc && { ...doc, ...meta, updatedAt });
}

export function patchTreeNode(node: TreeNode) {
  applyMeta(node.id, pickMeta(node));
}

const refreshTree = () => queryClient.invalidateQueries({ queryKey: keys.tree });

async function metaOf(id: string): Promise<NodeMeta> {
  const cached = queryClient.getQueryData<Tree>(keys.tree)?.metas[id];
  if (cached) return cached;
  return pickMeta(await loadDoc(id));
}

async function writeMeta(id: string, meta: NodeMeta) {
  applyMeta(id, meta);
  await api.patch(`/api/nodes/${id}`, { meta: await encrypt(meta) });
}

export async function saveContent(docId: string, content: JSONContent) {
  const text = indexText(content);
  const index: DocIndex = {
    text,
    tags: extractTags(content),
    links: extractWikiLinks(content).filter((id) => id !== docId),
    citations: [...new Set(extractCitations(content).map((citation) => citation.sourceId))].filter(Boolean),
  };
  const meta = { ...(await metaOf(docId)), wordCount: countWords(text) };
  const [metaBlob, contentBlob, indexBlob] = await Promise.all([encrypt(meta), encrypt(content), encrypt(index)]);
  await api.patch(`/api/nodes/${docId}`, { meta: metaBlob, content: contentBlob, index: indexBlob });
  applyMeta(docId, meta);
  patchTree((tree) => ({ ...tree, indexes: { ...tree.indexes, [docId]: index } }));
  queryClient.setQueryData<DocRecord>(keys.doc(docId), (doc) => doc && { ...doc, content });
}

export const actions = {
  async createNode(parentId: string, kind: "folder" | "document", title = "") {
    const meta = emptyMeta(title);
    const wire = await api.post<WireNode>("/api/nodes", { parentId, kind, meta: await encrypt(meta) });
    await refreshTree();
    return toTreeNode(wire, meta);
  },
  async updateNode(id: string, patch: Partial<NodeMeta>) {
    await writeMeta(id, { ...(await metaOf(id)), ...patch });
  },
  async moveNode(id: string, parentId: string, index: number) {
    patchTree((tree) => {
      const moving = tree.nodes.find((node) => node.id === id);
      if (!moving) return tree;
      const siblings = tree.nodes.filter((node) => node.parentId === parentId && node.id !== id).sort((a, b) => a.position - b.position);
      siblings.splice(index, 0, { ...moving, parentId });
      const positions = new Map(siblings.map((node, position) => [node.id, position]));
      return {
        ...tree,
        nodes: tree.nodes.map((node) =>
          positions.has(node.id) ? { ...node, parentId: node.id === id ? parentId : node.parentId, position: positions.get(node.id)! } : node,
        ),
      };
    });
    await api.patch(`/api/nodes/${id}`, { move: { parentId, index } });
    await refreshTree();
  },
  async deleteNode(id: string) {
    await api.del(`/api/nodes/${id}`);
    await refreshTree();
  },
  async duplicateNode(id: string) {
    const wire = await api.post<WireNode>(`/api/nodes/${id}`, { action: "duplicate" });
    const meta = { ...(await metaOf(id)) };
    const copy = { ...meta, title: `${meta.title} copy` };
    await api.patch(`/api/nodes/${wire.id}`, { meta: await encrypt(copy) });
    await refreshTree();
    return toTreeNode(wire, copy);
  },
  async restoreNode(id: string) {
    await api.post(`/api/nodes/${id}`, { action: "restore" });
    await refreshTree();
  },
  async createProject(title: string) {
    const folders = await Promise.all(
      (["manuscript", "research", "trash"] as const).map(async (role) => ({
        role,
        meta: await encrypt(emptyMeta(role[0].toUpperCase() + role.slice(1))),
      })),
    );
    const { id } = await api.post<{ id: string }>("/api/projects", { meta: await encrypt({ title }), folders });
    await refreshTree();
    return id;
  },
  async renameProject(id: string, title: string) {
    await api.patch(`/api/projects/${id}`, { meta: await encrypt({ title }) });
    await refreshTree();
  },
  async deleteProject(id: string) {
    await api.del(`/api/projects/${id}`);
    await refreshTree();
  },
  async emptyTrash(projectId: string) {
    await api.patch(`/api/projects/${projectId}`, { emptyTrash: true });
    await refreshTree();
  },
  async saveSource(input: Partial<SourceInput>, id?: string) {
    const existing = id ? (await loadSources()).find((source) => source.id === id) : undefined;
    const merged = { ...(existing ?? {}), ...input } as SourceInput;
    const data = await encrypt(merged);
    const record = id ? ((await api.patch(`/api/sources/${id}`, { data }), { id, createdAt: existing?.createdAt ?? Date.now() })) : await api.post<WireRecord>("/api/sources", { data });
    await queryClient.invalidateQueries({ queryKey: keys.sources });
    return { ...merged, id: record.id, createdAt: record.createdAt } as Source;
  },
  lookupSource: (url: string) => api.post<Partial<SourceInput>>("/api/metadata", { url }),
  async deleteSource(id: string) {
    await api.del(`/api/sources/${id}`);
    await Promise.all([queryClient.invalidateQueries({ queryKey: keys.sources }), queryClient.invalidateQueries({ queryKey: keys.collections })]);
  },
  async attachSource(docId: string, sourceId: string, attached: boolean) {
    const meta = await metaOf(docId);
    const manualSources = attached ? [...new Set([...meta.manualSources, sourceId])] : meta.manualSources.filter((entry) => entry !== sourceId);
    await writeMeta(docId, { ...meta, manualSources });
  },
  async createCollection(title: string) {
    const record = await api.post<WireRecord>("/api/collections", { data: await encrypt({ title, sourceIds: [] }) });
    await queryClient.invalidateQueries({ queryKey: keys.collections });
    return record.id;
  },
  async updateCollection(id: string, patch: { title?: string; sourceIds?: string[] }) {
    const current = (await loadCollections()).find((collection) => collection.id === id);
    if (!current) return;
    await api.patch(`/api/collections/${id}`, { data: await encrypt({ title: patch.title ?? current.title, sourceIds: patch.sourceIds ?? current.sourceIds }) });
    await queryClient.invalidateQueries({ queryKey: keys.collections });
  },
  async deleteCollection(id: string) {
    await api.del(`/api/collections/${id}`);
    await queryClient.invalidateQueries({ queryKey: keys.collections });
  },
  async createComment(comment: Comment) {
    queryClient.setQueryData<Comment[]>(keys.comments(comment.docId), (list) => [...(list ?? []), comment]);
    await api.post(`/api/nodes/${comment.docId}/comments`, {
      id: comment.id,
      data: await encrypt({ body: comment.body, quote: comment.quote, resolved: comment.resolved, createdAt: comment.createdAt }),
    });
  },
  async updateComment(docId: string, id: string, patch: Partial<Comment>) {
    const list = queryClient.getQueryData<Comment[]>(keys.comments(docId)) ?? [];
    const current = list.find((comment) => comment.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    queryClient.setQueryData<Comment[]>(keys.comments(docId), list.map((comment) => (comment.id === id ? next : comment)));
    await api.patch(`/api/comments/${id}`, { data: await encrypt({ body: next.body, quote: next.quote, resolved: next.resolved, createdAt: next.createdAt }) });
  },
  async deleteComment(docId: string, id: string) {
    queryClient.setQueryData<Comment[]>(keys.comments(docId), (list) => list?.filter((comment) => comment.id !== id));
    await api.del(`/api/comments/${id}`);
  },
  async updateSettings(patch: Partial<Settings>) {
    const current = queryClient.getQueryData<Settings>(keys.settings) ?? (await loadSettings());
    const next = { ...current, ...patch };
    queryClient.setQueryData<Settings>(keys.settings, next);
    await api.patch("/api/settings", { settings: await encrypt(next) });
  },
  async unshare(id: string) {
    await api.del(`/api/nodes/${id}/share`);
    queryClient.setQueryData<DocRecord>(keys.doc(id), (doc) => doc && { ...doc, shareSlug: null });
    patchTree((tree) => ({ ...tree, nodes: tree.nodes.map((node) => (node.id === id ? { ...node, shareSlug: null } : node)) }));
  },
  uploadImage: (file: File) => uploadAsset(file),
};
