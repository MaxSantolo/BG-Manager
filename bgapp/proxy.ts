import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "bgm_auth";

async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api/bgg-cookie guards itself with its own bearer token (it's called by the
  // scheduled refresher, which has no app password) — see that route.
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname.startsWith("/api/bgg-cookie")) {
    return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const expected = await tokenFor(password);
  const cookie = request.cookies.get(AUTH_COOKIE);

  if (cookie?.value === expected) return NextResponse.next();

  // API calls must get a real 401, not a 307 to the login HTML: a redirected GET
  // returns 200 + HTML, res.json() throws, and apiFetch silently degrades to
  // {ok:true, data:null}. A 401 lets the client detect the expired session.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest).*)"],
};
