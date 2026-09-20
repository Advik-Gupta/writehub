import { MongoClient, type Db } from "mongodb";
import { env } from "../env";
import type { AssetDoc, NodeDoc, ProjectDoc, RecordDoc, ShareDoc, UserDoc } from "./schema";

const globalForMongo = globalThis as unknown as { mongoPromise?: Promise<MongoClient>; mongoIndexes?: Promise<void> };

function connect() {
  if (!globalForMongo.mongoPromise) {
    globalForMongo.mongoPromise = new MongoClient(env().mongoUri, { maxPoolSize: 10, retryWrites: true }).connect();
  }
  return globalForMongo.mongoPromise;
}

async function database(): Promise<Db> {
  const client = await connect();
  return client.db(env().mongoDb);
}

export async function collections() {
  const db = await database();
  const handles = {
    users: db.collection<UserDoc>("users"),
    projects: db.collection<ProjectDoc>("projects"),
    nodes: db.collection<NodeDoc>("nodes"),
    sources: db.collection<RecordDoc>("sources"),
    sourceCollections: db.collection<RecordDoc>("source_collections"),
    comments: db.collection<RecordDoc>("comments"),
    shares: db.collection<ShareDoc>("shares"),
    assets: db.collection<AssetDoc>("assets"),
  };
  if (!globalForMongo.mongoIndexes) {
    globalForMongo.mongoIndexes = Promise.all([
      handles.users.createIndex({ email: 1 }, { unique: true }),
      handles.projects.createIndex({ userId: 1, position: 1 }),
      handles.nodes.createIndex({ userId: 1, parentId: 1, position: 1 }),
      handles.nodes.createIndex({ shareSlug: 1 }, { sparse: true }),
      handles.sources.createIndex({ userId: 1 }),
      handles.sourceCollections.createIndex({ userId: 1 }),
      handles.comments.createIndex({ userId: 1, docId: 1 }),
      handles.shares.createIndex({ userId: 1 }),
      handles.assets.createIndex({ userId: 1 }),
    ]).then(() => undefined);
  }
  await globalForMongo.mongoIndexes;
  return handles;
}
