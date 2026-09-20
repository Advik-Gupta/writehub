import { authed, body } from "@/lib/server/http";
import { collections } from "@/lib/server/mongo";
import type { AppLock } from "@/lib/server/schema";

export const PATCH = authed(async ({ req, userId }) => {
  const { appLock } = await body<{ appLock: AppLock | null }>(req);
  const { users } = await collections();
  await users.updateOne({ _id: userId }, { $set: { appLock: appLock ?? null, updatedAt: Date.now() } });
});
