import { NextResponse } from "next/server";
import { auth } from "./src/lib/auth/config";

export default auth((request) => {
  const isAuthenticated = Boolean(request.auth?.user);
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/conversations") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/backups") ||
    pathname.startsWith("/ai") ||
    pathname.startsWith("/mcp");

  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/agents/:path*",
    "/conversations/:path*",
    "/reports/:path*",
    "/backups/:path*",
    "/ai/:path*",
    "/mcp/:path*",
  ],
};
