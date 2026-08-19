import { getSession } from "@/lib/auth";
import { isAdminRole, type SessionPayload } from "@/lib/session";
import type { Prisma } from "@/app/generated/prisma/client";

export async function requireAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) return null;
  return session;
}

export function unauthorized() {
  return Response.json({ error: "Not authorized." }, { status: 401 });
}

export function badRequest(message = "Invalid request.") {
  return Response.json({ error: message }, { status: 400 });
}

export async function writeAudit(
  client: Prisma.TransactionClient,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: unknown
) {
  await client.auditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      details: details === undefined ? undefined : (details as Prisma.InputJsonValue),
    },
  });
}
