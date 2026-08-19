import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const doctorFields = {
  name: z.string().min(1, "Name is required."),
  specialization: z.string().min(1, "Specialization is required."),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  consultationFee: z.coerce.number().min(0, "Consultation fee must be >= 0."),
  advanceDiscount: z.coerce.number().min(0).max(100).default(0),
  experience: z.coerce.number().int().min(0).optional().nullable(),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  isActive: z.boolean().optional().default(true),
};

const availabilityItem = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration: z.coerce.number().int().min(10).max(120).default(30),
  isAvailable: z.boolean().optional().default(true),
});

export const createDoctorSchema = z.object({
  ...doctorFields,
  availability: z.array(availabilityItem).optional().default([]),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const doctors = await prisma.doctor.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      specialization: true,
      consultationFee: true,
      experience: true,
      rating: true,
      city: true,
      isActive: true,
      _count: { select: { appointments: true, timeSlots: true } },
    },
  });

  return Response.json({ doctors });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = createDoctorSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return badRequest(body.error.issues[0]?.message ?? "Invalid doctor details.");
  }

  const data = body.data;

  const doctor = await prisma.$transaction(async (tx) => {
    const created = await tx.doctor.create({
      data: {
        name: data.name,
        specialization: data.specialization,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        consultationFee: data.consultationFee,
        advanceDiscount: data.advanceDiscount,
        experience: data.experience ?? null,
        rating: data.rating ?? null,
        city: data.city || null,
        isActive: data.isActive,
        createdById: admin.sub,
        availability: data.availability.length
          ? {
              create: data.availability.map((a) => ({
                dayOfWeek: a.dayOfWeek,
                startTime: a.startTime,
                endTime: a.endTime,
                slotDuration: a.slotDuration,
                isAvailable: a.isAvailable,
              })),
            }
          : undefined,
      },
    });

    await writeAudit(tx, admin.sub, "CREATE_DOCTOR", "Doctor", created.id, {
      name: created.name,
    });

    return created;
  });

  return Response.json({ doctor: { id: doctor.id } }, { status: 201 });
}
