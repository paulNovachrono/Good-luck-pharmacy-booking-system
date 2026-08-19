import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

const ALLOWED: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
};

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest("Invalid status.");

  const next = body.data.status;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, status: true, slotId: true },
  });
  if (!appointment) return badRequest("Appointment not found.");

  if (appointment.status === next) {
    return Response.json({ success: true });
  }

  const allowed = ALLOWED[appointment.status];
  if (!allowed || !allowed.includes(next)) {
    return badRequest(`Cannot change status from ${appointment.status} to ${next}.`);
  }

  await prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = { status: next };

    if (next === "CANCELLED") {
      data.paymentStatus = "REFUNDED";
      await tx.payment.updateMany({
        where: { appointmentId: id },
        data: { status: "REFUNDED" },
      });
      if (appointment.slotId) {
        await tx.timeSlot.updateMany({
          where: { id: appointment.slotId },
          data: { isBooked: false },
        });
      }
    }

    await tx.appointment.update({ where: { id }, data: data as never });
    await writeAudit(tx, admin.sub, "UPDATE_APPOINTMENT_STATUS", "Appointment", id, {
      from: appointment.status,
      to: next,
    });
  });

  return Response.json({ success: true });
}
