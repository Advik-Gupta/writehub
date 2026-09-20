import { authed, body } from "@/lib/server/http";
import type { Encrypted } from "@/lib/server/schema";
import { deleteProject, emptyTrash, updateProject } from "@/lib/server/store";

export const PATCH = authed<"id">(async ({ req, userId, params }) => {
  const input = await body<{ meta?: Encrypted; emptyTrash?: boolean }>(req);
  if (input.meta) await updateProject(userId, params.id, input.meta);
  if (input.emptyTrash) await emptyTrash(userId, params.id);
});

export const DELETE = authed<"id">(({ userId, params }) => deleteProject(userId, params.id));

