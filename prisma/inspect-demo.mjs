import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const u = await p.user.findUnique({
  where: { phone: "+919876543210" },
  include: {
    appointments: {
      include: { rescheduleRequest: true },
      orderBy: { appointmentDate: "desc" },
    },
  },
});

for (const a of u.appointments) {
  console.log(
    a.id,
    a.status,
    a.appointmentDate.toISOString().slice(0, 10),
    a.startTime,
    "resched:",
    a.rescheduleRequest?.status ?? "none"
  );
}

const rr = await p.rescheduleRequest.findMany({
  include: { appointment: { select: { id: true, startTime: true, appointmentDate: true } }, requestedSlot: true },
});
console.log("--- requests ---");
for (const r of rr) {
  console.log(r.id, r.status, "reqSlot:", r.requestedSlot?.startTime ?? "none", r.requestedSlot?.isBooked ?? "", "appt:", r.appointment.id, r.appointment.startTime, r.appointment.appointmentDate.toISOString().slice(0, 10));
}

await p.$disconnect();
