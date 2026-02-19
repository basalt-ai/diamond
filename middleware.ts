import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/api/v1/health"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
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
      { status: 401 },
    );
  }

  const validKeys = process.env.API_KEYS?.split(",") ?? [];
  if (!validKeys.includes(token)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
      { status: 401 },
    );
  }

  const response = NextResponse.next();
  response.headers.set("x-api-key-id", token.slice(0, 8));
  return response;
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
