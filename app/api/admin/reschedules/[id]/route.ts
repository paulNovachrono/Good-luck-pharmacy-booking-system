import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  adminNotes: z.string().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest("Invalid action.");

  const { action, adminNotes } = body.data;

  const req = await prisma.rescheduleRequest.findUnique({
    where: { id },
    include: { appointment: { include: { doctor: true } } },
  });
  if (!req) return badRequest("Request not found.");
  if (req.status !== "PENDING") {
    return badRequest("This request has already been handled.");
  }

  const appointment = req.appointment;

  if (action === "APPROVED" && req.requestedSlotId) {
    const newSlot = await prisma.timeSlot.findUnique({ where: { id: req.requestedSlotId } });
    if (!newSlot || newSlot.isBooked) {
      return Response.json(
        { error: "The requested slot is no longer available. Ask the patient to pick another time." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeSlot.update({
        where: { id: newSlot.id },
        data: { isBooked: true },
      });
      if (appointment.slotId) {
        await tx.timeSlot.updateMany({
          where: { id: appointment.slotId },
          data: { isBooked: false },
        });
      }
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          slotId: newSlot.id,
          appointmentDate: newSlot.date,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          status: "CONFIRMED",
        },
      });
      await tx.rescheduleRequest.update({
        where: { id },
        data: { status: "APPROVED", adminNotes: adminNotes ?? null },
      });
      await writeAudit(tx, admin.sub, "APPROVE_RESCHEDULE", "Appointment", appointment.id, {
        from: `${appointment.appointmentDate.toISOString().slice(0, 10)} ${appointment.startTime}`,
        to: `${newSlot.date.toISOString().slice(0, 10)} ${newSlot.startTime}`,
      });
    });

    return Response.json({ success: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.rescheduleRequest.update({
      where: { id },
      data: { status: "REJECTED", adminNotes: adminNotes ?? null },
    });
    if (action === "REJECTED" && (appointment.status === "PENDING" || appointment.status === "CONFIRMED")) {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "CONFIRMED" },
      });
    }
    await writeAudit(tx, admin.sub, "REJECT_RESCHEDULE", "Appointment", appointment.id, {
      notes: adminNotes ?? null,
    });
  });

  return Response.json({ success: true });
}
