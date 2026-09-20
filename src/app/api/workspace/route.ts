import { authed } from "@/lib/server/http";
import { getWorkspace } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = authed(({ userId }) => getWorkspace(userId));
