import { prisma } from "@/lib/prisma";
import { fromDateKey, getAvailableSlots, toDateKey } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const doctor = await prisma.doctor.findUnique({ where: { id, isActive: true } });
  if (!doctor) {
    return Response.json({ error: "Doctor not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const dateKey = searchParams.get("date");
  const date = dateKey ? fromDateKey(dateKey) : null;

  if (!date) {
    return Response.json({ error: "Invalid or missing date (YYYY-MM-DD)." }, { status: 400 });
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date < today) {
    return Response.json({ slots: [] });
  }

  const slots = await getAvailableSlots(id, date);
  return Response.json({
    date: toDateKey(date),
    slots,
  });
}
