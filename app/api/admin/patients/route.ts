import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();

  const patients = await prisma.user.findMany({
    where: {
      role: "USER",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      whatsappOptIn: true,
      createdAt: true,
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { appointmentDate: "desc" },
        take: 1,
        select: { appointmentDate: true },
      },
    },
  });

  return Response.json({ patients });
}
