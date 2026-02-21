import { NextRequest, NextResponse } from "next/server";

const PUBLIC_API_PATHS = ["/api/v1/health", "/api/v1/setup/readiness"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Better Auth handle its own routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // API routes: Bearer token auth (unchanged)
  if (pathname.startsWith("/api/v1")) {
    if (PUBLIC_API_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    // In development, skip auth for same-origin browser requests
    if (process.env.NODE_ENV === "development") {
      const secFetchSite = request.headers.get("sec-fetch-site");
      if (secFetchSite === "same-origin") {
        return NextResponse.next();
      }
    }

    const authorization = request.headers.get("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or malformed Authorization header",
          },
        },
        { status: 401 }
      );
    }

    const validKeys = process.env.API_KEYS?.split(",") ?? [];
    if (!validKeys.includes(token)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
        { status: 401 }
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-api-key-id", token.slice(0, 8));
    return response;
  }

  // Dashboard/page routes: check for session cookie
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (static files, images)
     * - sign-in (auth page itself)
     * - setup (first-time setup wizard)
     * - favicon.ico
     * - api/auth (Better Auth routes — handled above but excluded from redirect logic)
     */
    "/((?!_next|sign-in|setup|favicon\\.ico|api/auth).*)",
  ],
};
