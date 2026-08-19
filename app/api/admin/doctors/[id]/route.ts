import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";
import { doctorFields } from "../route";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: doctorFields.name.optional(),
  specialization: doctorFields.specialization.optional(),
  description: doctorFields.description.optional(),
  imageUrl: doctorFields.imageUrl.optional(),
  consultationFee: doctorFields.consultationFee.optional(),
  advanceDiscount: doctorFields.advanceDiscount.optional(),
  experience: doctorFields.experience.optional(),
  rating: doctorFields.rating.optional(),
  city: doctorFields.city.optional(),
  isActive: doctorFields.isActive.optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return badRequest(body.error.issues[0]?.message ?? "Invalid details.");
  }

  const existing = await prisma.doctor.findUnique({ where: { id } });
  if (!existing) return badRequest("Doctor not found.");

  const data = body.data;

  const doctor = await prisma.$transaction(async (tx) => {
    const updated = await tx.doctor.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.specialization !== undefined ? { specialization: data.specialization } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
        ...(data.consultationFee !== undefined ? { consultationFee: data.consultationFee } : {}),
        ...(data.advanceDiscount !== undefined ? { advanceDiscount: data.advanceDiscount } : {}),
        ...(data.experience !== undefined ? { experience: data.experience ?? null } : {}),
        ...(data.rating !== undefined ? { rating: data.rating ?? null } : {}),
        ...(data.city !== undefined ? { city: data.city || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    await writeAudit(tx, admin.sub, "UPDATE_DOCTOR", "Doctor", id, {
      name: updated.name,
      isActive: updated.isActive,
    });

    return updated;
  });

  return Response.json({ doctor: { id: doctor.id } });
}
