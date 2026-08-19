import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";
import { fromDateKey } from "@/lib/slots";

export const dynamic = "force-dynamic";

const bookSchema = z.object({
  doctorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  patientName: z.string().min(1),
  patientPhone: z.string().regex(/^[+\d][\d\s-]{7,}$/),
  notes: z.string().max(1000).optional(),
});

const filterSchema = z.object({
  status: z.string().optional(),
  doctorId: z.string().optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const url = new URL(request.url);
  const parsed = filterSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return badRequest("Invalid filters.");

  const { status, doctorId, q, from, to, page, limit } = parsed.data;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (doctorId && doctorId !== "ALL") where.doctorId = doctorId;
  if (from || to) {
    where.appointmentDate = {};
    if (from) {
      const f = fromDateKey(from);
      if (!f) return badRequest("Invalid from date.");
      (where.appointmentDate as Record<string, unknown>).gte = f;
    }
    if (to) {
      const t = fromDateKey(to);
      if (!t) return badRequest("Invalid to date.");
      (where.appointmentDate as Record<string, unknown>).lte = t;
    }
  }
  if (q) {
    where.OR = [
      { patientName: { contains: q, mode: "insensitive" } },
      { patientPhone: { contains: q } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q } } },
      { doctor: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where: where as never,
      orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        appointmentDate: true,
        startTime: true,
        endTime: true,
        status: true,
        paymentStatus: true,
        paymentAmount: true,
        bookingMethod: true,
        patientName: true,
        patientPhone: true,
        notes: true,
        user: { select: { name: true, phone: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
        rescheduleRequest: { select: { status: true } },
      },
    }),
    prisma.appointment.count({ where: where as never }),
  ]);

  return Response.json({ appointments, total, page, limit });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = bookSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest("Please fill all required fields.");

  const { doctorId, date: dateKey, startTime, patientName, patientPhone, notes } = body.data;

  const dateObj = fromDateKey(dateKey);
  if (!dateObj) return badRequest("Invalid date.");

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return badRequest("Doctor not found.");

  const phone = patientPhone.replace(/[\s-]/g, "");

  try {
    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { phone } });
      if (!user) {
        user = await tx.user.create({ data: { phone, name: patientName, role: "USER" } });
      }

      const slot = await tx.timeSlot.findUnique({
        where: { doctorId_date_startTime: { doctorId, date: dateObj, startTime } },
      });
      if (!slot || slot.isBooked) throw new Error("SLOT_TAKEN");

      const claimed = await tx.timeSlot.updateMany({
        where: { id: slot.id, isBooked: false },
        data: { isBooked: true },
      });
      if (claimed.count === 0) throw new Error("SLOT_TAKEN");

      const appointment = await tx.appointment.create({
        data: {
          userId: user.id,
          doctorId,
          slotId: slot.id,
          appointmentDate: dateObj,
          startTime,
          endTime: slot.endTime,
          status: "CONFIRMED",
          paymentStatus: "PENDING",
          paymentAmount: doctor.consultationFee,
          bookingMethod: "ADMIN_BOOKED",
          patientName,
          patientPhone: phone,
          notes: notes ?? null,
        },
      });

      if (process.env.MOCK_WHATSAPP !== "false") {
        await tx.whatsAppMessage.create({
          data: {
            userId: user.id,
            phoneNumber: phone,
            messageBody: `Hi ${patientName}! Your appointment with ${doctor.name} on ${dateKey} at ${startTime} has been booked.`,
            status: "SENT",
          },
        });
      }

      await writeAudit(tx, admin.sub, "BOOK_APPOINTMENT", "Appointment", appointment.id, {
        doctorId,
        date: dateKey,
        startTime,
        patientPhone: phone,
      });

      return appointment;
    });

    return Response.json({ appointment: { id: result.id } }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return Response.json({ error: "That slot is already booked." }, { status: 409 });
    }
    throw e;
  }
}
