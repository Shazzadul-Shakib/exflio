import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/crypto";

const PUBLIC_ROUTES = ["/login", "/signup"];
const COOKIE_NAME = "exflio_session";

function hasValidSession(request: NextRequest): boolean {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = verifyToken<{ userId: string; exp: number }>(token);
  return !!payload && payload.exp > Date.now();
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname === "/";
  const authed = hasValidSession(request);

  if (!authed && !isPublicRoute) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authed && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
