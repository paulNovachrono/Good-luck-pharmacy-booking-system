import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
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
    orderBy: { name: "asc" },
  });

  return Response.json(doctors);
}
