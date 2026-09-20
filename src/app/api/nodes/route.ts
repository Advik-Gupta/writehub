import { authed, body } from "@/lib/server/http";
import type { Encrypted } from "@/lib/server/schema";
import { createNode } from "@/lib/server/store";

export const POST = authed(async ({ req, userId }) => {
  const input = await body<{ parentId: string; kind: "folder" | "document"; meta: Encrypted; content?: Encrypted; index?: Encrypted }>(req);
  return createNode(userId, input);
});
