import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_API = ["/api/auth/login", "/api/auth/register", "/api/auth/challenge", "/api/auth/logout", "/api/auth/session"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = Boolean(request.cookies.get("writehub_session"));

  if (pathname.startsWith("/api/")) {
    if (signedIn || PUBLIC_API.includes(pathname)) return NextResponse.next();
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!signedIn && (pathname === "/" || pathname.startsWith("/account"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (signedIn && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/account/:path*", "/api/:path*"],
};
