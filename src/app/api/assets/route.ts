import { authed, body } from "@/lib/server/http";
import { createAsset } from "@/lib/server/store";

export const POST = authed(async ({ req, userId }) => {
  const { iv, data } = await body<{ iv: string; data: string }>(req);
  return { id: await createAsset(userId, iv, data) };
});
