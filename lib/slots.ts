import { prisma } from "@/lib/prisma";

export interface SlotInfo {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

function startOfDay(d: Date): Date {
  return fromDateKey(toDateKey(d))!;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function ensureSlotsForDate(doctorId: string, date: Date): Promise<void> {
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
    const start = parseTime(av.startTime);
    const end = parseTime(av.endTime);
    const duration = av.slotDuration || 30;
    for (let t = start; t + duration <= end; t += duration) {
      const startTime = formatTime(t);
      if (existingSet.has(startTime)) continue;
      creates.push({
        doctorId,
        date: day,
        startTime,
        endTime: formatTime(t + duration),
      });
    }
  }

  if (creates.length > 0) {
    await prisma.timeSlot.createMany({ data: creates, skipDuplicates: true });
  }
}

export async function getAvailableSlots(doctorId: string, date: Date): Promise<SlotInfo[]> {
  const day = startOfDay(date);
  await ensureSlotsForDate(doctorId, day);

  const slots = await prisma.timeSlot.findMany({
    where: { doctorId, date: day, isBooked: false },
    orderBy: { startTime: "asc" },
  });

  return slots.map((s) => ({
    id: s.id,
    date: toDateKey(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
  }));
}
