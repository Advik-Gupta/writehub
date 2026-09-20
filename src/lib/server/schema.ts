import type { Binary } from "mongodb";

export interface Encrypted {
  ct: string;
  iv: string;
}

export interface UserDoc {
  _id: string;
  email: string;
  authHash: string;
  kdfSalt: string;
  wrappedKey: Encrypted;
  profile: Encrypted | null;
  settings: Encrypted | null;
  appLock: { salt: string; wrappedKey: Encrypted } | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectDoc {
  _id: string;
  userId: string;
  position: number;
  meta: Encrypted;
  createdAt: number;
}

export interface NodeDoc {
  _id: string;
  userId: string;
  projectId: string;
  parentId: string | null;
  kind: "folder" | "document";
  role: "manuscript" | "research" | "trash" | null;
  position: number;
  meta: Encrypted;
  content: Encrypted | null;
  index: Encrypted | null;
  shareSlug: string | null;
  trashedFrom: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RecordDoc {
  _id: string;
  userId: string;
  docId?: string;
  data: Encrypted;
  createdAt: number;
}

export interface ShareDoc {
  _id: string;
  userId: string;
  docId: string;
  title: string;
  author: string;
  html: string;
  wordCount: number;
  updatedAt: number;
}

export interface AssetDoc {
  _id: string;
  userId: string;
  iv: string;
  data: Binary;
  createdAt: number;
}

export interface AppLock {
  salt: string;
  wrappedKey: Encrypted;
}
