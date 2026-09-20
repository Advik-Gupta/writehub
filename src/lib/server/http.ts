import { NextResponse } from "next/server";
import { currentUserId } from "./session";

export type RouteContext<P extends string = never> = { params?: Promise<Record<P, string>> };

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function fail(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Request failed";
  return NextResponse.json({ error: message }, { status: 400 });
}

async function finish(result: unknown) {
  return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
}

export function open<P extends string = never>(handler: (ctx: { req: Request; params: Record<P, string> }) => unknown) {
  return async (req: Request, context: RouteContext<P> = {}) => {
    try {
      const params = context.params ? await context.params : ({} as Record<P, string>);
      return await finish(await handler({ req, params }));
    } catch (error) {
      return fail(error);
    }
  };
}

export function authed<P extends string = never>(handler: (ctx: { req: Request; userId: string; params: Record<P, string> }) => unknown) {
  return async (req: Request, context: RouteContext<P> = {}) => {
    try {
      const userId = await currentUserId();
      if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      const params = context.params ? await context.params : ({} as Record<P, string>);
      return await finish(await handler({ req, userId, params }));
    } catch (error) {
      return fail(error);
    }
  };
}

export async function body<T>(req: Request) {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError("Invalid request body", 400);
  }
}
