import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1, "Name is required."),
  phone: z.string().regex(/^[+\d][\d\s-]{7,}$/, "Enter a valid phone number."),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { createdDoctors: true } },
    },
  });

  return Response.json({ me: { id: admin.sub, role: admin.role }, users });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Only super admins can manage admins." }, { status: 403 });
  }

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return badRequest(body.error.issues[0]?.message ?? "Invalid details.");
  }

  const phone = body.data.phone.replace(/[\s-]/g, "");

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    if (existing.role === "USER") {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: existing.id }, data: { role: body.data.role, name: body.data.name } });
        await writeAudit(tx, admin.sub, "PROMOTE_USER", "User", existing.id, {
          role: body.data.role,
        });
      });
      return Response.json({ user: { id: existing.id } }, { status: 201 });
    }
    return badRequest("A user with this phone already exists.");
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: body.data.name,
        phone,
        email: body.data.email || null,
        role: body.data.role,
      },
    });
    await writeAudit(tx, admin.sub, "CREATE_ADMIN", "User", created.id, {
      role: created.role,
    });
    return created;
  });

  return Response.json({ user: { id: user.id } }, { status: 201 });
}
