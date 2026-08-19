import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

const rowSchema = z.object({
  name: z.string().optional().default(""),
  specialization: z.string().optional().default(""),
  consultationFee: z.coerce.number().min(0).optional().default(0),
  description: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  experience: z.coerce.number().int().min(0).optional().nullable(),
  city: z.string().optional().default(""),
});

const importSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, "No rows to import."),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = importSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest(body.error.issues[0]?.message ?? "Invalid import data.");

  const created: { name: string }[] = [];
  const errors: { row: number; error: string }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const [idx, rawRow] of body.data.rows.entries()) {
      const row = rowSchema.safeParse(rawRow);
      if (!row.success || !row.data.name.trim() || !row.data.specialization.trim()) {
        errors.push({ row: idx + 2, error: "Missing name or specialization." });
        continue;
      }
      created.push({ name: row.data.name });
      await tx.doctor.create({
        data: {
          name: row.data.name,
          specialization: row.data.specialization,
          consultationFee: row.data.consultationFee,
          description: row.data.description || null,
          imageUrl: row.data.imageUrl || null,
          experience: row.data.experience ?? null,
          city: row.data.city || null,
          createdById: admin.sub,
        },
      });
    }

    if (created.length > 0) {
      await writeAudit(tx, admin.sub, "IMPORT_DOCTORS", "Doctor", null, {
        count: created.length,
        errors: errors.length,
      });
    }
  });

  return Response.json({
    success: true,
    created: created.length,
    errors,
  });
}
