import { authed, body } from "@/lib/server/http";
import type { Encrypted } from "@/lib/server/schema";
import { createRecord, listRecords } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = authed(({ userId }) => listRecords(userId, "sourceCollections"));

export const POST = authed(async ({ req, userId }) => {
  const { data } = await body<{ data: Encrypted }>(req);
  return createRecord(userId, "sourceCollections", data);
});
