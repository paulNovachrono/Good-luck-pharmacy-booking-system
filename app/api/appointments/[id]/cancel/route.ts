import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, slotId: true, doctorId: true },
  });
  if (!appointment || appointment.userId !== session.sub) {
    return Response.json({ error: "Appointment not found." }, { status: 404 });
  }
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    return Response.json({ error: "This appointment cannot be cancelled." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED", paymentStatus: "REFUNDED" },
    }),
    prisma.payment.updateMany({
      where: { appointmentId: id },
      data: { status: "REFUNDED" },
    }),
    ...(appointment.slotId
      ? [
          prisma.timeSlot.updateMany({
            where: { id: appointment.slotId },
            data: { isBooked: false },
          }),
        ]
      : []),
  ]);

  return Response.json({ success: true });
}
