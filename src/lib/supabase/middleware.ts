import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes should never be redirected by page auth logic.
  if (pathname.startsWith("/api")) {
    return NextResponse.next({ request });
  }

  const userId = request.cookies.get("cf_user_id")?.value;
  const publicPaths = ["/login", "/verify"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!userId && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (userId && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
