import { authed, body } from "@/lib/server/http";
import type { Encrypted } from "@/lib/server/schema";
import { deleteRecord, updateRecord } from "@/lib/server/store";

export const PATCH = authed<"id">(async ({ req, userId, params }) => {
  const { data } = await body<{ data: Encrypted }>(req);
  await updateRecord(userId, "sources", params.id, data);
});

export const DELETE = authed<"id">(({ userId, params }) => deleteRecord(userId, "sources", params.id));
