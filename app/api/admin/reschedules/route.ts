import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const requests = await prisma.rescheduleRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      reason: true,
      adminNotes: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, phone: true } },
      appointment: {
        select: {
          id: true,
          appointmentDate: true,
          startTime: true,
          status: true,
          doctor: { select: { id: true, name: true } },
        },
      },
      requestedSlot: {
        select: { date: true, startTime: true, endTime: true, isBooked: true },
      },
    },
  });

  return Response.json({ requests });
}
