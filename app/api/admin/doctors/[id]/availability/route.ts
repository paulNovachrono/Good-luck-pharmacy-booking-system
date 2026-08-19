import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

const availabilitySchema = z.object({
  availability: z
    .array(
      z.object({
        id: z.string().optional(),
        dayOfWeek: z.coerce.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        slotDuration: z.coerce.number().int().min(10).max(120).default(30),
        isAvailable: z.boolean().optional().default(true),
      })
    )
    .default([]),
});

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const availability = await prisma.doctorAvailability.findMany({
    where: { doctorId: id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return Response.json({ availability });
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = availabilitySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest("Invalid availability.");

  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) return badRequest("Doctor not found.");

  await prisma.$transaction(async (tx) => {
    await tx.doctorAvailability.deleteMany({ where: { doctorId: id } });
    if (body.data.availability.length > 0) {
      await tx.doctorAvailability.createMany({
        data: body.data.availability.map((a) => ({
          doctorId: id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          slotDuration: a.slotDuration,
          isAvailable: a.isAvailable,
        })),
      });
    }
    await writeAudit(tx, admin.sub, "UPDATE_AVAILABILITY", "Doctor", id, {
      count: body.data.availability.length,
    });
  });

  return Response.json({ success: true });
}
