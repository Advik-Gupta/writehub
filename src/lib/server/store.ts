import { randomBytes, randomUUID } from "node:crypto";
import { Binary } from "mongodb";
import { HttpError } from "./http";
import { collections } from "./mongo";
import type { Encrypted, NodeDoc, ProjectDoc, RecordDoc } from "./schema";

export interface WireProject {
  id: string;
  position: number;
  meta: Encrypted;
  createdAt: number;
}

export interface WireNode {
  id: string;
  projectId: string;
  parentId: string | null;
  kind: "folder" | "document";
  role: "manuscript" | "research" | "trash" | null;
  position: number;
  meta: Encrypted;
  index: Encrypted | null;
  shareSlug: string | null;
  trashedFrom: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface WireRecord {
  id: string;
  docId?: string;
  data: Encrypted;
  createdAt: number;
}

const toProject = (doc: ProjectDoc): WireProject => ({ id: doc._id, position: doc.position, meta: doc.meta, createdAt: doc.createdAt });

const toNode = (doc: NodeDoc): WireNode => ({
  id: doc._id,
  projectId: doc.projectId,
  parentId: doc.parentId,
  kind: doc.kind,
  role: doc.role,
  position: doc.position,
  meta: doc.meta,
  index: doc.index,
  shareSlug: doc.shareSlug,
  trashedFrom: doc.trashedFrom,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toRecord = (doc: RecordDoc): WireRecord => ({ id: doc._id, docId: doc.docId, data: doc.data, createdAt: doc.createdAt });

async function requireNode(userId: string, id: string) {
  const { nodes } = await collections();
  const node = await nodes.findOne({ _id: id, userId });
  if (!node) throw new HttpError("Not found", 404);
  return node;
}

async function nextPosition(userId: string, parentId: string) {
  const { nodes } = await collections();
  const last = await nodes.find({ userId, parentId }).sort({ position: -1 }).limit(1).toArray();
  return last.length ? last[0].position + 1 : 0;
}

async function subtreeIds(userId: string, rootId: string) {
  const { nodes } = await collections();
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const children = await nodes.find({ userId, parentId: { $in: frontier } }, { projection: { _id: 1 } }).toArray();
    frontier = children.map((child) => child._id);
    ids.push(...frontier);
  }
  return ids;
}

async function ancestors(userId: string, id: string) {
  const { nodes } = await collections();
  const chain: NodeDoc[] = [];
  let current = (await nodes.findOne({ _id: id, userId }))?.parentId ?? null;
  while (current) {
    const parent = await nodes.findOne({ _id: current, userId });
    if (!parent) break;
    chain.push(parent);
    current = parent.parentId;
  }
  return chain;
}

const inTrash = async (userId: string, id: string) => (await ancestors(userId, id)).some((node) => node.role === "trash");

export async function getWorkspace(userId: string) {
  const { projects, nodes } = await collections();
  const [projectDocs, nodeDocs] = await Promise.all([
    projects.find({ userId }).sort({ position: 1 }).toArray(),
    nodes.find({ userId }, { projection: { content: 0 } }).sort({ position: 1 }).toArray(),
  ]);
  return { projects: projectDocs.map(toProject), nodes: (nodeDocs as NodeDoc[]).map(toNode) };
}

export async function createProject(userId: string, meta: Encrypted, folders: { role: "manuscript" | "research" | "trash"; meta: Encrypted }[]) {
  const { projects, nodes } = await collections();
  const now = Date.now();
  const id = randomUUID();
  const position = (await projects.find({ userId }).sort({ position: -1 }).limit(1).toArray())[0]?.position ?? -1;
  await projects.insertOne({ _id: id, userId, position: position + 1, meta, createdAt: now });
  const folderDocs: NodeDoc[] = folders.map((folder, index) => ({
    _id: randomUUID(),
    userId,
    projectId: id,
    parentId: null,
    kind: "folder",
    role: folder.role,
    position: index,
    meta: folder.meta,
    content: null,
    index: null,
    shareSlug: null,
    trashedFrom: null,
    createdAt: now,
    updatedAt: now,
  }));
  await nodes.insertMany(folderDocs);
  return { id, folders: folderDocs.map(toNode) };
}

export async function updateProject(userId: string, id: string, meta: Encrypted) {
  const { projects } = await collections();
  const result = await projects.updateOne({ _id: id, userId }, { $set: { meta } });
  if (!result.matchedCount) throw new HttpError("Not found", 404);
}

export async function deleteProject(userId: string, id: string) {
  const { projects, nodes, comments, shares } = await collections();
  const docs = await nodes.find({ userId, projectId: id }, { projection: { _id: 1 } }).toArray();
  const ids = docs.map((doc) => doc._id);
  await Promise.all([
    projects.deleteOne({ _id: id, userId }),
    nodes.deleteMany({ userId, projectId: id }),
    comments.deleteMany({ userId, docId: { $in: ids } }),
    shares.deleteMany({ userId, docId: { $in: ids } }),
  ]);
}

export async function createNode(userId: string, input: { parentId: string; kind: "folder" | "document"; meta: Encrypted; content?: Encrypted; index?: Encrypted }) {
  const { nodes } = await collections();
  const parent = await requireNode(userId, input.parentId);
  if (parent.kind !== "folder") throw new HttpError("Parent must be a folder", 400);
  const now = Date.now();
  const doc: NodeDoc = {
    _id: randomUUID(),
    userId,
    projectId: parent.projectId,
    parentId: parent._id,
    kind: input.kind,
    role: null,
    position: await nextPosition(userId, parent._id),
    meta: input.meta,
    content: input.content ?? null,
    index: input.index ?? null,
    shareSlug: null,
    trashedFrom: null,
    createdAt: now,
    updatedAt: now,
  };
  await nodes.insertOne(doc);
  return toNode(doc);
}

export async function getNode(userId: string, id: string) {
  const doc = await requireNode(userId, id);
  return { ...toNode(doc), content: doc.content };
}

export async function updateNode(userId: string, id: string, patch: { meta?: Encrypted; content?: Encrypted; index?: Encrypted }) {
  const { nodes } = await collections();
  const set: Partial<NodeDoc> = { updatedAt: Date.now() };
  if (patch.meta) set.meta = patch.meta;
  if (patch.content) set.content = patch.content;
  if (patch.index) set.index = patch.index;
  const doc = await nodes.findOneAndUpdate({ _id: id, userId }, { $set: set }, { returnDocument: "after", projection: { content: 0 } });
  if (!doc) throw new HttpError("Not found", 404);
  return toNode(doc as NodeDoc);
}

export async function moveNode(userId: string, id: string, parentId: string, index: number) {
  const { nodes } = await collections();
  const node = await requireNode(userId, id);
  if (node.role) throw new HttpError("System folders cannot be moved", 400);
  const parent = await requireNode(userId, parentId);
  if (parent.kind !== "folder") throw new HttpError("Target must be a folder", 400);
  if ((await ancestors(userId, parentId)).some((entry) => entry._id === id) || parentId === id) {
    throw new HttpError("Cannot move a folder into itself", 400);
  }

  const siblings = (await nodes.find({ userId, parentId, _id: { $ne: id } }, { projection: { _id: 1 } }).sort({ position: 1 }).toArray()).map((doc) => doc._id);
  siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, id);
  await nodes.bulkWrite(siblings.map((sibling, position) => ({ updateOne: { filter: { _id: sibling, userId }, update: { $set: { position } } } })));

  const trashedFrom = (await inTrash(userId, parentId)) || parent.role === "trash" ? (node.trashedFrom ?? node.parentId) : null;
  await nodes.updateOne({ _id: id, userId }, { $set: { parentId, trashedFrom, updatedAt: Date.now() } });
  if (parent.projectId !== node.projectId) {
    const ids = await subtreeIds(userId, id);
    await nodes.updateMany({ userId, _id: { $in: ids } }, { $set: { projectId: parent.projectId } });
  }
}

async function purge(userId: string, id: string) {
  const { nodes, comments, shares } = await collections();
  const ids = await subtreeIds(userId, id);
  await Promise.all([
    nodes.deleteMany({ userId, _id: { $in: ids } }),
    comments.deleteMany({ userId, docId: { $in: ids } }),
    shares.deleteMany({ userId, docId: { $in: ids } }),
  ]);
}

export async function deleteNode(userId: string, id: string) {
  const { nodes } = await collections();
  const node = await requireNode(userId, id);
  if (node.role) throw new HttpError("System folders cannot be deleted", 400);
  if (await inTrash(userId, id)) return purge(userId, id);
  const trash = await nodes.findOne({ userId, projectId: node.projectId, role: "trash" });
  if (!trash) throw new HttpError("Trash folder missing", 400);
  await nodes.updateOne(
    { _id: id, userId },
    { $set: { parentId: trash._id, trashedFrom: node.parentId, position: await nextPosition(userId, trash._id), updatedAt: Date.now() } },
  );
}

export async function restoreNode(userId: string, id: string) {
  const { nodes } = await collections();
  const node = await requireNode(userId, id);
  const original = node.trashedFrom ? await nodes.findOne({ _id: node.trashedFrom, userId }) : null;
  const fallback = await nodes.findOne({ userId, projectId: node.projectId, role: "manuscript" });
  const target = original && !(await inTrash(userId, original._id)) && original.role !== "trash" ? original : fallback;
  if (!target) throw new HttpError("Nowhere to restore to", 400);
  await moveNode(userId, id, target._id, Number.MAX_SAFE_INTEGER);
}

export async function emptyTrash(userId: string, projectId: string) {
  const { nodes } = await collections();
  const trash = await nodes.findOne({ userId, projectId, role: "trash" });
  if (!trash) return;
  const children = await nodes.find({ userId, parentId: trash._id }, { projection: { _id: 1 } }).toArray();
  for (const child of children) await purge(userId, child._id);
}

export async function duplicateNode(userId: string, id: string) {
  const { nodes } = await collections();
  const source = await requireNode(userId, id);
  if (source.role) throw new HttpError("System folders cannot be duplicated", 400);
  const now = Date.now();
  const copyTree = async (original: NodeDoc, parentId: string, position: number): Promise<string> => {
    const copyId = randomUUID();
    await nodes.insertOne({ ...original, _id: copyId, parentId, position, shareSlug: null, trashedFrom: null, createdAt: now, updatedAt: now });
    const children = await nodes.find({ userId, parentId: original._id }).sort({ position: 1 }).toArray();
    let index = 0;
    for (const child of children) {
      await copyTree(child, copyId, index);
      index += 1;
    }
    return copyId;
  };
  await nodes.updateMany({ userId, parentId: source.parentId, position: { $gt: source.position } }, { $inc: { position: 1 } });
  const copyId = await copyTree(source, source.parentId as string, source.position + 1);
  return toNode((await nodes.findOne({ _id: copyId, userId })) as NodeDoc);
}

type RecordKind = "sources" | "sourceCollections" | "comments";

export async function listRecords(userId: string, kind: RecordKind, docId?: string) {
  const handles = await collections();
  const filter = docId ? { userId, docId } : { userId };
  return (await handles[kind].find(filter).sort({ createdAt: 1 }).toArray()).map(toRecord);
}

export async function createRecord(userId: string, kind: RecordKind, data: Encrypted, options: { id?: string; docId?: string } = {}) {
  const handles = await collections();
  const doc: RecordDoc = { _id: options.id ?? randomUUID(), userId, docId: options.docId, data, createdAt: Date.now() };
  await handles[kind].insertOne(doc);
  return toRecord(doc);
}

export async function updateRecord(userId: string, kind: RecordKind, id: string, data: Encrypted) {
  const handles = await collections();
  const result = await handles[kind].updateOne({ _id: id, userId }, { $set: { data } });
  if (!result.matchedCount) throw new HttpError("Not found", 404);
}

export async function deleteRecord(userId: string, kind: RecordKind, id: string) {
  const handles = await collections();
  await handles[kind].deleteOne({ _id: id, userId });
}

export async function publishShare(userId: string, docId: string, snapshot: { title: string; author: string; html: string; wordCount: number }) {
  const { nodes, shares } = await collections();
  const node = await requireNode(userId, docId);
  const slug = node.shareSlug ?? randomBytes(12).toString("base64url");
  await shares.updateOne(
    { _id: slug },
    { $set: { userId, docId, title: snapshot.title, author: snapshot.author, html: snapshot.html, wordCount: snapshot.wordCount, updatedAt: Date.now() } },
    { upsert: true },
  );
  await nodes.updateOne({ _id: docId, userId }, { $set: { shareSlug: slug } });
  return slug;
}

export async function revokeShare(userId: string, docId: string) {
  const { nodes, shares } = await collections();
  await shares.deleteMany({ userId, docId });
  await nodes.updateOne({ _id: docId, userId }, { $set: { shareSlug: null } });
}

export async function readShare(slug: string) {
  const { shares } = await collections();
  return shares.findOne({ _id: slug });
}

export async function createAsset(userId: string, iv: string, data: string) {
  const { assets } = await collections();
  const id = randomUUID();
  await assets.insertOne({ _id: id, userId, iv, data: new Binary(Buffer.from(data, "base64")), createdAt: Date.now() });
  return id;
}

export async function readAsset(userId: string, id: string) {
  const { assets } = await collections();
  const asset = await assets.findOne({ _id: id, userId });
  if (!asset) throw new HttpError("Not found", 404);
  return { iv: asset.iv, data: Buffer.from(asset.data.buffer).toString("base64") };
}

export async function deleteEverything(userId: string) {
  const handles = await collections();
  await Promise.all([
    handles.nodes.deleteMany({ userId }),
    handles.projects.deleteMany({ userId }),
    handles.sources.deleteMany({ userId }),
    handles.sourceCollections.deleteMany({ userId }),
    handles.comments.deleteMany({ userId }),
    handles.shares.deleteMany({ userId }),
    handles.assets.deleteMany({ userId }),
  ]);
  await handles.users.deleteOne({ _id: userId });
}
