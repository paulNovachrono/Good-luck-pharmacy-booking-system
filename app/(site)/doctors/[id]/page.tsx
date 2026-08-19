import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingWidget from "@/components/booking-widget";

export const dynamic = "force-dynamic";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      specialization: true,
      description: true,
      consultationFee: true,
      advanceDiscount: true,
      experience: true,
      rating: true,
      city: true,
      isActive: true,
      availability: {
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          slotDuration: true,
          isAvailable: true,
        },
      },
    },
  });

  if (!doctor || !doctor.isActive) notFound();

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const activeDays = doctor.availability
    .filter((a) => a.isAvailable)
    .map((a) => ({
      day: days[a.dayOfWeek],
      hours: `${a.startTime} – ${a.endTime}`,
    }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-sm bg-deep-green/10 flex items-center justify-center text-deep-green font-display text-2xl shrink-0">
              {doctor.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-tight text-primary">
                {doctor.name}
              </h1>
              <p className="text-body-muted mt-1">{doctor.specialization}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {doctor.rating ? (
                  <span className="text-xs bg-soft-stone border border-hairline rounded-full px-2.5 py-0.5">
                    {doctor.rating} ★ rating
                  </span>
                ) : null}
                {doctor.experience ? (
                  <span className="text-xs bg-soft-stone border border-hairline rounded-full px-2.5 py-0.5">
                    {doctor.experience} yrs experience
                  </span>
                ) : null}
                {doctor.city ? (
                  <span className="text-xs bg-soft-stone border border-hairline rounded-full px-2.5 py-0.5">
                    {doctor.city}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {doctor.description ? (
            <p className="text-body-muted leading-relaxed mt-6 max-w-xl">
              {doctor.description}
            </p>
          ) : null}

          <div className="mt-8">
            <h2 className="font-display text-lg tracking-tight text-primary mb-4">
              Consultation fee
            </h2>
            <div className="bg-soft-stone rounded-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-ink">₹{doctor.consultationFee}</p>
                {doctor.advanceDiscount > 0 ? (
                  <p className="text-xs text-body-muted mt-1">
                    ₹{doctor.advanceDiscount} discount if you pay in advance
                  </p>
                ) : (
                  <p className="text-xs text-body-muted mt-1">
                    No advance payment required
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-lg tracking-tight text-primary mb-4">
              Clinic hours
            </h2>
            {activeDays.length === 0 ? (
              <p className="text-body-muted text-sm">No active schedule yet.</p>
            ) : (
              <ul className="space-y-2">
                {activeDays.map((d) => (
                  <li key={d.day} className="flex items-center justify-between text-sm">
                    <span className="text-body-muted">{d.day}</span>
                    <span className="text-ink font-medium">{d.hours}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <BookingWidget doctorId={doctor.id} consultationFee={doctor.consultationFee} />
        </div>
      </div>
    </div>
  );
}
