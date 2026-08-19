import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DoctorCard from "@/components/doctor-card";
import Button from "@/components/button";

export default async function HomePage() {
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      specialization: true,
      consultationFee: true,
      experience: true,
      rating: true,
      city: true,
    },
    orderBy: { rating: "desc" },
    take: 4,
  });

  return (
    <div>
      <section className="bg-soft-stone">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 flex flex-col items-start gap-6">
          <p className="text-xs uppercase tracking-widest text-deep-green font-semibold">
            Green Leaf Polyclinic
          </p>
          <h1 className="font-display text-4xl md:text-6xl tracking-tight text-primary max-w-3xl leading-tight">
            Book verified doctors near you.
          </h1>
          <p className="text-body-muted max-w-xl text-lg leading-relaxed">
            No advance payment required. Pick a slot, confirm with OTP, and get
            WhatsApp reminders before your visit.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Button href="/doctors" variant="primary" className="px-6 py-3 text-sm">
              Book an Appointment
            </Button>
            <Button href="/account" variant="outline" className="px-6 py-3 text-sm">
              My Appointments
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl md:text-3xl tracking-tight text-primary">
              Popular doctors
            </h2>
            <p className="text-body-muted text-sm mt-1">
              Trusted specialists across Kolkata.
            </p>
          </div>
          <Link
            href="/doctors"
            className="text-sm text-deep-green font-semibold hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {doctors.map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
