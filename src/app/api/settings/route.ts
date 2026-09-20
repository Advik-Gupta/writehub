import { authed, body } from "@/lib/server/http";
import { collections } from "@/lib/server/mongo";
import type { Encrypted } from "@/lib/server/schema";

export const dynamic = "force-dynamic";

export const GET = authed(async ({ userId }) => {
  const { users } = await collections();
  const user = await users.findOne({ _id: userId });
  return { settings: user?.settings ?? null };
});

export const PATCH = authed(async ({ req, userId }) => {
  const { settings } = await body<{ settings: Encrypted }>(req);
  const { users } = await collections();
  await users.updateOne({ _id: userId }, { $set: { settings, updatedAt: Date.now() } });
});
