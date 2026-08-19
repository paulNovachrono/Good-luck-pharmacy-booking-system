import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fromDateKey } from "@/lib/slots";

export const dynamic = "force-dynamic";

const bookSchema = z.object({
  doctorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const appointments = await prisma.appointment.findMany({
    where: { userId: session.sub },
    orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
    select: {
      id: true,
      appointmentDate: true,
      startTime: true,
      endTime: true,
      status: true,
      paymentStatus: true,
      paymentAmount: true,
      notes: true,
      doctor: {
        select: {
          id: true,
          name: true,
          specialization: true,
          consultationFee: true,
        },
      },
    },
  });

  return Response.json({ appointments });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = bookSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid booking details." }, { status: 400 });
  }

  const { doctorId, date: dateKey, startTime, notes } = body.data;

  const dateObj = fromDateKey(dateKey);
  if (!dateObj) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dateObj < today) {
    return Response.json({ error: "Cannot book a past date." }, { status: 400 });
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId, isActive: true },
  });
  if (!doctor) {
    return Response.json({ error: "Doctor not found." }, { status: 404 });
  }

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const slot = await tx.timeSlot.findUnique({
        where: { doctorId_date_startTime: { doctorId, date: dateObj, startTime } },
      });
      if (!slot || slot.isBooked) {
        throw new Error("SLOT_TAKEN");
      }

      const claimed = await tx.timeSlot.updateMany({
        where: { id: slot.id, isBooked: false },
        data: { isBooked: true },
      });
      if (claimed.count === 0) {
        throw new Error("SLOT_TAKEN");
      }

      const settings = await tx.setting.findMany({
        where: { key: { in: ["mockPayments", "mockWhatsapp"] } },
      });
      const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
      const isMockPayment =
        settingsMap.mockPayments !== false && process.env.MOCK_PAYMENTS !== "false";
      const isMockWhatsapp =
        settingsMap.mockWhatsapp !== false && process.env.MOCK_WHATSAPP !== "false";

      const amount = doctor.consultationFee;

      const created = await tx.appointment.create({
        data: {
          userId: session.sub,
          doctorId,
          slotId: slot.id,
          appointmentDate: dateObj,
          startTime,
          endTime: slot.endTime,
          status: isMockPayment ? "CONFIRMED" : "PENDING",
          paymentStatus: isMockPayment ? "PAID" : "PENDING",
          paymentAmount: amount,
          bookingMethod: "ONLINE",
          notes: notes ?? null,
        },
      });

      await tx.payment.create({
        data: {
          appointmentId: created.id,
          amount,
          paymentMethod: isMockPayment ? "MOCK" : "PENDING",
          transactionId: isMockPayment ? `mock_${randomUUID()}` : null,
          status: isMockPayment ? "PAID" : "PENDING",
        },
      });

      if (isMockWhatsapp) {
        await tx.whatsAppMessage.create({
          data: {
            userId: session.sub,
            phoneNumber: session.phone,
            messageBody: `Hi! Your appointment with ${doctor.name} on ${dateKey} at ${startTime} is confirmed.`,
            status: "SENT",
          },
        });
      }

      return created;
    });

    return Response.json(
      {
        appointment: {
          id: appointment.id,
          date: dateKey,
          startTime: appointment.startTime,
          status: appointment.status,
          paymentStatus: appointment.paymentStatus,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return Response.json(
        { error: "That slot was just taken. Please pick another time." },
        { status: 409 }
      );
    }
    throw e;
  }
}
