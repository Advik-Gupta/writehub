import { body, HttpError, open } from "@/lib/server/http";
import { collections } from "@/lib/server/mongo";
import { hashSecret, newUserId, startSession } from "@/lib/server/session";
import type { Encrypted } from "@/lib/server/schema";

interface RegisterBody {
  email: string;
  authSecret: string;
  kdfSalt: string;
  wrappedKey: Encrypted;
  profile: Encrypted;
  settings: Encrypted;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = open(async ({ req }) => {
  const input = await body<RegisterBody>(req);
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new HttpError("Enter a valid email address", 400);
  if (!input.authSecret || !input.kdfSalt || !input.wrappedKey?.ct) throw new HttpError("Missing credentials", 400);

  const { users } = await collections();
  if (await users.findOne({ email })) throw new HttpError("An account already uses that email", 409);

  const now = Date.now();
  const id = newUserId();
  await users.insertOne({
    _id: id,
    email,
    authHash: hashSecret(input.authSecret),
    kdfSalt: input.kdfSalt,
    wrappedKey: input.wrappedKey,
    profile: input.profile ?? null,
    appLock: null,
    settings: input.settings ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await startSession(id);
  return { email, createdAt: now };
});
