import { prisma } from "@/lib/prisma";
import DoctorCard from "@/components/doctor-card";

export const metadata = {
  title: "Find a Doctor",
};

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { specialization: { contains: query, mode: "insensitive" } },
              { city: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      specialization: true,
      consultationFee: true,
      experience: true,
      rating: true,
      city: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="max-w-2xl mb-10">
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-primary">
          Find a doctor
        </h1>
        <p className="text-body-muted mt-2">
          {query
            ? `Results for "${query}"`
            : "Browse verified doctors and book a slot that suits you."}
        </p>
      </div>

      <form
        action="/doctors"
        className="flex gap-2 mb-10 max-w-lg"
        method="get"
      >
        <input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search by name, specialty, or city…"
          className="flex-1 rounded-full border border-hairline px-5 py-3 text-sm focus:outline-none focus:border-deep-green"
        />
        <button
          type="submit"
          className="rounded-full bg-deep-green text-on-primary px-6 py-3 text-sm font-semibold hover:bg-primary transition-colors cursor-pointer"
        >
          Search
        </button>
      </form>

      {doctors.length === 0 ? (
        <p className="text-body-muted">No doctors found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </div>
      )}
    </div>
  );
}
