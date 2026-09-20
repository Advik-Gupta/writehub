import { authed, body } from "@/lib/server/http";
import type { Encrypted } from "@/lib/server/schema";
import { createRecord, listRecords } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = authed<"id">(({ userId, params }) => listRecords(userId, "comments", params.id));

export const POST = authed<"id">(async ({ req, userId, params }) => {
  const input = await body<{ id: string; data: Encrypted }>(req);
  return createRecord(userId, "comments", input.data, { id: input.id, docId: params.id });
});
