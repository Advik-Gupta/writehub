import { open } from "@/lib/server/http";
import { endSession } from "@/lib/server/session";

export const POST = open(async () => {
  await endSession();
});
