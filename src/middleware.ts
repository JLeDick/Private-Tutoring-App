import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";

const COOKIE = "ged_session";

function secretKey() {
  const s =
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV !== "production"
      ? "development-only-secret-min-16"
      : "");
  if (!s || s.length < 16) {
    return null;
  }
  return new TextEncoder().encode(s);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp)$/)
  ) {
    return NextResponse.next();
  }

  const key = secretKey();
  const token = req.cookies.get(COOKIE)?.value;

  if (pathname === "/login") {
    if (token && key) {
      try {
        const { payload } = await jwtVerify(token, key);
        const role = payload.role as string | undefined;
        if (role === "STUDENT") {
          return NextResponse.redirect(new URL("/student", req.url));
        }
        if (role === "TUTOR") {
          return NextResponse.redirect(new URL("/tutor", req.url));
        }
      } catch {
        /* allow login */
      }
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    if (!token || !key) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    try {
      const { payload } = await jwtVerify(token, key);
      const role = payload.role as string | undefined;
      if (role === "STUDENT") {
        return NextResponse.redirect(new URL("/student", req.url));
      }
      if (role === "TUTOR") {
        return NextResponse.redirect(new URL("/tutor", req.url));
      }
    } catch {
      /* fallthrough */
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/student")) {
    if (!token || !key) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    try {
      const { payload } = await jwtVerify(token, key);
      if (payload.role !== "STUDENT") {
        return NextResponse.redirect(new URL("/tutor", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/tutor")) {
    if (!token || !key) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    try {
      const { payload } = await jwtVerify(token, key);
      if (payload.role !== "TUTOR") {
        return NextResponse.redirect(new URL("/student", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
