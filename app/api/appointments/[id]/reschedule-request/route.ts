import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fromDateKey, ensureSlotsForDate } from "@/lib/slots";

export const dynamic = "force-dynamic";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Pick a date and time for the new appointment." }, { status: 400 });
  }

  const { date: dateKey, startTime, reason } = body.data;
  const dateObj = fromDateKey(dateKey);
  if (!dateObj) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      doctorId: true,
      slotId: true,
      appointmentDate: true,
      startTime: true,
      status: true,
    },
  });
  if (!appointment || appointment.userId !== session.sub) {
    return Response.json({ error: "Appointment not found." }, { status: 404 });
  }
  if (appointment.status !== "CONFIRMED" && appointment.status !== "PENDING") {
    return Response.json({ error: "This appointment cannot be rescheduled." }, { status: 400 });
  }

  const existingRequest = await prisma.rescheduleRequest.findUnique({
    where: { appointmentId: id },
  });
  if (existingRequest && existingRequest.status === "PENDING") {
    return Response.json({ error: "You already have a pending reschedule request." }, { status: 409 });
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dateObj < today) {
    return Response.json({ error: "Cannot reschedule to a past date." }, { status: 400 });
  }

  await ensureSlotsForDate(appointment.doctorId, dateObj);

  const slot = await prisma.timeSlot.findUnique({
    where: { doctorId_date_startTime: { doctorId: appointment.doctorId, date: dateObj, startTime } },
  });
  if (!slot || slot.isBooked) {
    return Response.json({ error: "That slot is not available." }, { status: 409 });
  }

  const requestRow = await prisma.rescheduleRequest.upsert({
    where: { appointmentId: id },
    create: {
      appointmentId: id,
      userId: session.sub,
      requestedSlotId: slot.id,
      reason: reason ?? null,
      status: "PENDING",
    },
    update: {
      requestedSlotId: slot.id,
      reason: reason ?? null,
      status: "PENDING",
      adminNotes: null,
    },
  });

  return Response.json({ request: { id: requestRow.id } }, { status: 201 });
}
