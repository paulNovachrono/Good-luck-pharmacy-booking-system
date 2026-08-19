import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/app/generated/prisma/client";

export const SESSION_COOKIE = "glp_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-only-secret-change-me");

export interface SessionPayload {
  sub: string;
  phone: string;
  role: Role;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ phone: payload.phone, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || !payload.role) return null;
    return {
      sub: payload.sub,
      phone: typeof payload.phone === "string" ? payload.phone : "",
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export function isAdminRole(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
