import { authed } from "@/lib/server/http";
import { readAsset } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = authed<"id">(({ userId, params }) => readAsset(userId, params.id));
