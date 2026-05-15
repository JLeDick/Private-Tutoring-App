import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

const COOKIE = "ged_session";

function secretKey() {
  const s =
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV !== "production"
      ? "development-only-secret-min-16"
      : "");
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set to a long random string (16+ chars).");
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  sub: string;
  role: Role;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const role = payload.role as Role | undefined;
    if (!sub || (role !== "STUDENT" && role !== "TUTOR")) return null;
    return { sub, role };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const s = await readSession();
  if (!s) return null;
  return s;
}
