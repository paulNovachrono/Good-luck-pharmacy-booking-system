import "dotenv/config";
import { randomUUID } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

async function ensureSlots(doctorId: string, date: Date) {
  const day = startOfDay(date);
  const dayOfWeek = day.getUTCDay();
  const availability = await prisma.doctorAvailability.findMany({
    where: { doctorId, dayOfWeek, isAvailable: true },
  });
  if (availability.length === 0) return;
  const existing = await prisma.timeSlot.findMany({
    where: { doctorId, date: day },
    select: { startTime: true },
  });
  const existingSet = new Set(existing.map((s) => s.startTime));
  const creates: { doctorId: string; date: Date; startTime: string; endTime: string }[] = [];
  for (const av of availability) {
    const duration = av.slotDuration || 30;
    for (let t = parseTime(av.startTime); t + duration <= parseTime(av.endTime); t += duration) {
      const startTime = formatTime(t);
      if (existingSet.has(startTime)) continue;
      creates.push({ doctorId, date: day, startTime, endTime: formatTime(t + duration) });
    }
  }
  if (creates.length > 0) {
    await prisma.timeSlot.createMany({ data: creates, skipDuplicates: true });
  }
}

async function book(
  userId: string,
  doctorId: string,
  date: Date,
  status: string,
  paymentStatus: string,
  notes?: string
) {
  await ensureSlots(doctorId, date);
  const day = startOfDay(date);
  const slot = await prisma.timeSlot.findFirst({
    where: { doctorId, date: day, isBooked: false },
    orderBy: { startTime: "asc" },
  });
  if (!slot) return null;

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  await prisma.timeSlot.update({ where: { id: slot.id }, data: { isBooked: true } });

  const appointment = await prisma.appointment.create({
    data: {
      userId,
      doctorId,
      slotId: slot.id,
      appointmentDate: day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: status as never,
      paymentStatus: paymentStatus as never,
      paymentAmount: doctor?.consultationFee ?? 0,
      bookingMethod: "ONLINE",
      notes: notes ?? null,
    },
  });

  await prisma.payment.create({
    data: {
      appointmentId: appointment.id,
      amount: doctor?.consultationFee ?? 0,
      paymentMethod: "MOCK",
      transactionId: `mock_${randomUUID()}`,
      status: paymentStatus as never,
    },
  });

  await prisma.whatsAppMessage.create({
    data: {
      userId,
      phoneNumber: "+919876543210",
      messageBody: `Demo: appointment with ${doctor?.name} on ${day.toISOString().slice(0, 10)} at ${slot.startTime}.`,
      status: "SENT",
    },
  });

  return appointment;
}

async function main() {
  const today = startOfDay(new Date());

  let patient = await prisma.user.findUnique({ where: { phone: "+919876543210" } });
  if (!patient) {
    patient = await prisma.user.create({
      data: { name: "Rahul Sharma", phone: "+919876543210", role: "USER" },
    });
  }

  const existing = await prisma.appointment.count({ where: { userId: patient.id } });
  if (existing > 0) {
    console.log(`Demo data already present for ${patient.name} (${existing} appointments). Skipping.`);
    return;
  }

  const doctors = await prisma.doctor.findMany({ take: 4 });

  await book(patient.id, doctors[0].id, addDays(today, -4), "COMPLETED", "PAID", "Follow-up visit");
  await book(patient.id, doctors[2].id, addDays(today, -2), "CANCELLED", "REFUNDED", "Could not attend");
  const upcoming = await book(patient.id, doctors[1].id, addDays(today, 3), "CONFIRMED", "PAID");
  await book(patient.id, doctors[3].id, addDays(today, 4), "CONFIRMED", "PAID");
  await book(patient.id, doctors[0].id, addDays(today, 6), "PENDING", "PENDING");

  if (upcoming) {
    const targetDate = addDays(today, 5);
    await ensureSlots(upcoming.doctorId, targetDate);
    const targetSlot = await prisma.timeSlot.findFirst({
      where: { doctorId: upcoming.doctorId, date: startOfDay(targetDate), isBooked: false },
      orderBy: { startTime: "asc" },
    });
    if (targetSlot) {
      await prisma.rescheduleRequest.create({
        data: {
          appointmentId: upcoming.id,
          userId: patient.id,
          requestedSlotId: targetSlot.id,
          reason: "Meeting at work on the original date.",
          status: "PENDING",
        },
      });
      console.log("Created a pending reschedule request for", upcoming.id);
    }
  }

  console.log(`Demo data ready for ${patient.name} (+919876543210).`);
  console.log("Log in with this phone to see appointments; admin can see them in the admin panel.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
