import type { JSONContent } from "@tiptap/core";

export type NodeKind = "folder" | "document";
export type FolderRole = "manuscript" | "research" | "trash";
export type DocStatus = "not_started" | "drafting" | "revising" | "done";
export type CitationStyle = "mla" | "apa" | "chicago";
export type SourceKind = "book" | "article" | "website" | "person";
export type ExportFormat = "md" | "html" | "txt";

export interface Encrypted {
  ct: string;
  iv: string;
}

export interface Project {
  id: string;
  title: string;
  position: number;
  createdAt: number;
}

export interface OutlineTopic {
  id: string;
  title: string;
  done: boolean;
  depth: number;
}

export interface Outline {
  topics: OutlineTopic[];
  checked: string[];
}

export interface NodeMeta {
  title: string;
  synopsis: string;
  status: DocStatus;
  starred: boolean;
  wordCount: number;
  wordGoal: number | null;
  outline: Outline;
  manualSources: string[];
}

export interface TreeNode extends NodeMeta {
  id: string;
  projectId: string;
  parentId: string | null;
  kind: NodeKind;
  role: FolderRole | null;
  position: number;
  shareSlug: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DocIndex {
  text: string;
  tags: string[];
  links: string[];
  citations: string[];
}

export interface Tree {
  projects: Project[];
  nodes: TreeNode[];
  metas: Record<string, NodeMeta>;
  indexes: Record<string, DocIndex>;
}

export interface DocRecord extends TreeNode {
  content: JSONContent | null;
}

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  authors: string;
  container: string;
  publisher: string;
  date: string;
  url: string;
  pages: string;
  accessed: string;
  notes: string;
  createdAt: number;
}

export type SourceInput = Omit<Source, "id" | "createdAt">;

export interface DocSource {
  sourceId: string;
  cited: boolean;
  manual: boolean;
}

export interface Collection {
  id: string;
  title: string;
  sourceIds: string[];
  createdAt: number;
}

export interface Comment {
  id: string;
  docId: string;
  body: string;
  quote: string;
  resolved: boolean;
  createdAt: number;
}

export interface Settings {
  author: string;
  citationStyle: CitationStyle;
  lockAfterMinutes: number;
}

export interface Profile {
  name: string;
  purpose: string;
  writing: string[];
  cadence: string;
  experience: string;
  focus: string;
}

export interface LinkRef {
  id: string;
  title: string;
  projectTitle: string;
}

export interface DocLinks {
  backlinks: LinkRef[];
  outgoing: LinkRef[];
  tags: string[];
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface SearchResults {
  documents: (LinkRef & { snippet: string })[];
  sources: Source[];
  tags: string[];
}

export interface CompileRequest {
  docIds: string[];
  includeTitles: boolean;
  separator: "none" | "rule";
  format: ExportFormat;
  title: string;
  createDocument: boolean;
}

export const STATUS_LABELS: Record<DocStatus, string> = {
  not_started: "Not started",
  drafting: "Drafting",
  revising: "Revising",
  done: "Done",
};

export const DEFAULT_SETTINGS: Settings = { author: "", citationStyle: "mla", lockAfterMinutes: 15 };

export const emptyMeta = (title = ""): NodeMeta => ({
  title,
  synopsis: "",
  status: "not_started",
  starred: false,
  wordCount: 0,
  wordGoal: null,
  outline: { topics: [], checked: [] },
  manualSources: [],
});
