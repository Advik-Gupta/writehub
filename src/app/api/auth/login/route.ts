import { body, HttpError, open } from "@/lib/server/http";
import { collections } from "@/lib/server/mongo";
import { startSession, verifySecret } from "@/lib/server/session";

export const POST = open(async ({ req }) => {
  const { email, authSecret } = await body<{ email: string; authSecret: string }>(req);
  const normalised = String(email ?? "").trim().toLowerCase();
  const { users } = await collections();
  const user = await users.findOne({ email: normalised });
  if (!user || !authSecret || !verifySecret(authSecret, user.authHash)) throw new HttpError("Email or password is incorrect", 401);
  await startSession(user._id);
  return { email: user.email, kdfSalt: user.kdfSalt, wrappedKey: user.wrappedKey, appLock: user.appLock ?? null, profile: user.profile ?? null, createdAt: user.createdAt };
});
