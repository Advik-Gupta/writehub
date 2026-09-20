import { authed, body } from "@/lib/server/http";
import type { Encrypted } from "@/lib/server/schema";
import { createProject } from "@/lib/server/store";

export const POST = authed(async ({ req, userId }) => {
  const input = await body<{ meta: Encrypted; folders: { role: "manuscript" | "research" | "trash"; meta: Encrypted }[] }>(req);
  return createProject(userId, input.meta, input.folders);
});
