import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import DashboardCharts from "@/components/admin/dashboard-charts";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-pale-green text-deep-green",
  PENDING: "bg-pale-blue text-action-blue",
  COMPLETED: "bg-soft-stone text-body-muted",
  CANCELLED: "bg-soft-stone text-error",
  NO_SHOW: "bg-soft-stone text-error",
};

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const today = startOfDay(new Date());
  const twoWeeksAgo = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [
    todayCount,
    upcomingCount,
    patientCount,
    activeDoctorCount,
    revenueThisMonth,
    recent,
    statusGroup,
    perDay,
    doctorStats,
  ] = await Promise.all([
    prisma.appointment.count({ where: { appointmentDate: today } }),
    prisma.appointment.count({
      where: { appointmentDate: { gte: today }, status: { in: ["PENDING", "CONFIRMED"] } },
    }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.doctor.count({ where: { isActive: true } }),
    prisma.appointment.aggregate({
      where: { paymentStatus: "PAID", appointmentDate: { gte: monthStart, lt: today } },
      _sum: { paymentAmount: true },
    }),
    prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        appointmentDate: true,
        startTime: true,
        status: true,
        paymentAmount: true,
        user: { select: { name: true, phone: true } },
        doctor: { select: { name: true, specialization: true } },
      },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: { appointmentDate: { gte: twoWeeksAgo, lte: today } },
      select: { appointmentDate: true, paymentStatus: true, paymentAmount: true },
    }),
    prisma.doctor.findMany({
      select: {
        name: true,
        _count: { select: { appointments: true } },
        appointments: {
          where: { paymentStatus: "PAID" },
          select: { paymentAmount: true },
        },
      },
    }),
  ]);

  const statusBreakdown = statusGroup.map((g) => ({
    name: g.status,
    value: g._count._all,
  }));

  const appointmentsPerDay: { label: string; appointments: number; revenue: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const day = new Date(twoWeeksAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const label = day.toISOString().slice(5, 10);
    const dayAppts = perDay.filter((a) => a.appointmentDate.getTime() === day.getTime());
    appointmentsPerDay.push({
      label,
      appointments: dayAppts.length,
      revenue: dayAppts
        .filter((a) => a.paymentStatus === "PAID")
        .reduce((sum, a) => sum + (a.paymentAmount ?? 0), 0),
    });
  }

  const doctorStatsData = doctorStats
    .map((d) => ({
      name: d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name,
      appointments: d._count.appointments,
      revenue: d.appointments.reduce((sum, a) => sum + (a.paymentAmount ?? 0), 0),
    }))
    .sort((a, b) => b.appointments - a.appointments)
    .slice(0, 8);

  const cards = [
    { label: "Appointments today", value: String(todayCount) },
    { label: "Upcoming appointments", value: String(upcomingCount) },
    { label: "Registered patients", value: String(patientCount) },
    { label: "Active doctors", value: String(activeDoctorCount) },
    { label: "Revenue this month", value: `₹${(revenueThisMonth._sum.paymentAmount ?? 0).toLocaleString("en-IN")}` },
  ];

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-primary">Dashboard</h1>
          <p className="text-sm text-body-muted mt-1">{"Overview of your clinic's activity."}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-hairline rounded-lg p-4">
            <p className="text-xs text-body-muted uppercase tracking-wide">{c.label}</p>
            <p className="font-display text-2xl font-semibold text-primary mt-2">{c.value}</p>
          </div>
        ))}
      </div>

      <DashboardCharts
        appointmentsPerDay={appointmentsPerDay}
        doctorStats={doctorStatsData}
        statusBreakdown={statusBreakdown}
      />

      <div className="bg-white border border-hairline rounded-lg mt-6">
        <div className="px-5 py-4 border-b border-hairline">
          <h3 className="font-display text-sm font-semibold text-primary">Recent appointments</h3>
        </div>
        <ul className="divide-y divide-hairline">
          {recent.length === 0 ? (
            <li className="px-5 py-6 text-sm text-body-muted">No appointments yet.</li>
          ) : (
            recent.map((a) => (
              <li key={a.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {a.user?.name ?? a.user?.phone ?? "Patient"} — {a.doctor.name}
                  </p>
                  <p className="text-xs text-body-muted mt-0.5">
                    {a.appointmentDate.toISOString().slice(0, 10)} · {a.startTime}
                    {a.paymentAmount ? ` · ₹${a.paymentAmount}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs rounded-full px-2.5 py-0.5 font-semibold shrink-0 ${
                    STATUS_COLORS[a.status] ?? "bg-soft-stone"
                  }`}
                >
                  {a.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
