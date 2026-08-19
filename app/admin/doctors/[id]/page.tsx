import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import DoctorForm from "@/components/admin/doctor-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Doctor",
};

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      specialization: true,
      description: true,
      imageUrl: true,
      consultationFee: true,
      advanceDiscount: true,
      experience: true,
      rating: true,
      city: true,
      isActive: true,
    },
  });
  if (!doctor) redirect("/admin/doctors");

  const availability = await prisma.doctorAvailability.findMany({
    where: { doctorId: id },
  });

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-primary">Edit doctor</h1>
        <p className="text-sm text-body-muted mt-1">{doctor.name}</p>
      </div>
      <DoctorForm
        doctorId={doctor.id}
        initial={{
          name: doctor.name,
          specialization: doctor.specialization,
          description: doctor.description ?? "",
          imageUrl: doctor.imageUrl ?? "",
          consultationFee: doctor.consultationFee,
          advanceDiscount: doctor.advanceDiscount,
          experience: doctor.experience?.toString() ?? "",
          rating: doctor.rating?.toString() ?? "",
          city: doctor.city ?? "",
          isActive: doctor.isActive,
          availability: availability.map((a) => ({
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            slotDuration: a.slotDuration,
            isAvailable: a.isAvailable,
          })),
        }}
      />
    </div>
  );
}
