import { authed, body } from "@/lib/server/http";
import { collections } from "@/lib/server/mongo";
import type { Encrypted } from "@/lib/server/schema";

export const PATCH = authed(async ({ req, userId }) => {
  const { profile } = await body<{ profile: Encrypted }>(req);
  const { users } = await collections();
  await users.updateOne({ _id: userId }, { $set: { profile, updatedAt: Date.now() } });
});
