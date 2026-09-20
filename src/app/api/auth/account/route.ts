import { authed, body, HttpError } from "@/lib/server/http";
import { collections } from "@/lib/server/mongo";
import type { Encrypted, UserDoc } from "@/lib/server/schema";
import { endSession, hashSecret, verifySecret } from "@/lib/server/session";
import { deleteEverything } from "@/lib/server/store";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UpdateBody {
  authSecret: string;
  email?: string;
  profile?: Encrypted;
  credentials?: { authSecret: string; kdfSalt: string; wrappedKey: Encrypted };
}

async function authorise(userId: string, authSecret: string) {
  const { users } = await collections();
  const user = await users.findOne({ _id: userId });
  if (!user || !authSecret || !verifySecret(authSecret, user.authHash)) throw new HttpError("Password is incorrect", 401);
  return user;
}

export const PATCH = authed(async ({ req, userId }) => {
  const input = await body<UpdateBody>(req);
  await authorise(userId, input.authSecret);
  const { users } = await collections();
  const set: Partial<UserDoc> = { updatedAt: Date.now() };

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw new HttpError("Enter a valid email address", 400);
    const taken = await users.findOne({ email, _id: { $ne: userId } });
    if (taken) throw new HttpError("An account already uses that email", 409);
    set.email = email;
  }
  if (input.profile) set.profile = input.profile;
  if (input.credentials) {
    set.authHash = hashSecret(input.credentials.authSecret);
    set.kdfSalt = input.credentials.kdfSalt;
    set.wrappedKey = input.credentials.wrappedKey;
    set.appLock = null;
  }

  await users.updateOne({ _id: userId }, { $set: set });
  const updated = await users.findOne({ _id: userId });
  return { email: updated?.email, kdfSalt: updated?.kdfSalt, wrappedKey: updated?.wrappedKey, appLock: updated?.appLock ?? null };
});

export const DELETE = authed(async ({ req, userId }) => {
  const { authSecret } = await body<{ authSecret: string }>(req);
  await authorise(userId, authSecret);
  await deleteEverything(userId);
  await endSession();
});
