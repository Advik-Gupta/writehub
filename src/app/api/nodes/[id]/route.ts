import { authed, body, HttpError } from "@/lib/server/http";
import type { Encrypted } from "@/lib/server/schema";
import { deleteNode, duplicateNode, getNode, moveNode, restoreNode, updateNode } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = authed<"id">(({ userId, params }) => getNode(userId, params.id));

export const PATCH = authed<"id">(async ({ req, userId, params }) => {
  const input = await body<{ meta?: Encrypted; content?: Encrypted; index?: Encrypted; move?: { parentId: string; index: number } }>(req);
  if (input.move) await moveNode(userId, params.id, input.move.parentId, input.move.index);
  if (input.meta || input.content || input.index) return updateNode(userId, params.id, input);
  return { ok: true };
});

export const POST = authed<"id">(async ({ req, userId, params }) => {
  const { action } = await body<{ action: string }>(req);
  if (action === "duplicate") return duplicateNode(userId, params.id);
  if (action === "restore") return restoreNode(userId, params.id);
  throw new HttpError(`Unknown action ${action}`, 400);
});

export const DELETE = authed<"id">(({ userId, params }) => deleteNode(userId, params.id));
