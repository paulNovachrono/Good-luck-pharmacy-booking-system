import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      specialization: true,
      description: true,
      imageUrl: true,
      consultationFee: true,
      experience: true,
      rating: true,
      isActive: true,
    },
  });

  if (!doctor) {
    return Response.json({ error: "Doctor not found." }, { status: 404 });
  }

  return Response.json(doctor);
}
