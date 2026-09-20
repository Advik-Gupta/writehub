import { authed, body } from "@/lib/server/http";
import { publishShare, revokeShare } from "@/lib/server/store";

export const POST = authed<"id">(async ({ req, userId, params }) => {
  const snapshot = await body<{ title: string; author: string; html: string; wordCount: number }>(req);
  return { slug: await publishShare(userId, params.id, snapshot) };
});

export const DELETE = authed<"id">(({ userId, params }) => revokeShare(userId, params.id));
