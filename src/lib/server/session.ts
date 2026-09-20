import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "../env";

const COOKIE_NAME = "writehub_session";

export function hashSecret(secret: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(secret, salt, 64).toString("hex")}`;
}

export function verifySecret(secret: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(secret, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sign(value: string) {
  return createHmac("sha256", env().sessionSecret).update(value).digest("base64url");
}

export function newUserId() {
  return randomUUID();
}

export async function startSession(userId: string) {
  const expires = Date.now() + env().sessionTtlDays * 86_400_000;
  const payload = Buffer.from(JSON.stringify({ userId, expires })).toString("base64url");
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function currentUserId() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const { userId, expires } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof userId === "string" && typeof expires === "number" && expires > Date.now() ? userId : null;
  } catch {
    return null;
  }
}
