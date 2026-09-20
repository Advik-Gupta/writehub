import { createHmac } from "node:crypto";
import { body, open } from "@/lib/server/http";
import { env } from "@/lib/env";
import { collections } from "@/lib/server/mongo";

export const POST = open(async ({ req }) => {
  const { email } = await body<{ email: string }>(req);
  const normalised = String(email ?? "").trim().toLowerCase();
  const { users } = await collections();
  const user = normalised ? await users.findOne({ email: normalised }) : null;
  const decoy = createHmac("sha256", env().sessionSecret).update(`salt:${normalised}`).digest("base64").slice(0, 24);
  return { kdfSalt: user?.kdfSalt ?? decoy };
});
