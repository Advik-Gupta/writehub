import { authed, body, HttpError } from "@/lib/server/http";
import { fetchSourceMetadata } from "@/lib/server/metadata";

export const POST = authed(async ({ req }) => {
  const { url } = await body<{ url: string }>(req);
  if (!/^https?:\/\//i.test(url ?? "")) throw new HttpError("Enter a valid link", 400);
  return fetchSourceMetadata(url);
});
