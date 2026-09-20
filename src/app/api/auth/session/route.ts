import { authed } from "@/lib/server/http";
import { collections } from "@/lib/server/mongo";

export const dynamic = "force-dynamic";

export const GET = authed(async ({ userId }) => {
  const { users } = await collections();
  const user = await users.findOne({ _id: userId });
  if (!user) return { signedIn: false };
  return { signedIn: true, email: user.email, kdfSalt: user.kdfSalt, wrappedKey: user.wrappedKey, appLock: user.appLock ?? null, profile: user.profile ?? null, createdAt: user.createdAt };
});
