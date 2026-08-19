import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import CancelButton from "@/components/cancel-button";
import Button from "@/components/button";
import LogoutButton from "@/components/logout-button";
import RescheduleForm from "@/components/reschedule-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Appointments",
};

const statusStyles: Record<string, string> = {
  CONFIRMED: "bg-pale-green text-deep-green",
  PENDING: "bg-pale-blue text-action-blue",
  COMPLETED: "bg-soft-stone text-body-muted",
  CANCELLED: "bg-soft-stone text-error",
  NO_SHOW: "bg-soft-stone text-error",
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const appointments = await prisma.appointment.findMany({
    where: { userId: session.sub },
    orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
    select: {
      id: true,
      appointmentDate: true,
      startTime: true,
      endTime: true,
      status: true,
      paymentStatus: true,
      paymentAmount: true,
      doctor: {
        select: { id: true, name: true, specialization: true },
      },
    },
  });

  const reschedulePending = await prisma.rescheduleRequest.findMany({
    where: { userId: session.sub, status: "PENDING" },
    select: { appointmentId: true },
  });
  const pendingSet = new Set(reschedulePending.map((r) => r.appointmentId));

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-primary">
            My Appointments
          </h1>
          <p className="text-body-muted mt-2">
            {appointments.length === 0
              ? "You have no appointments yet."
              : `${appointments.length} appointment${appointments.length > 1 ? "s" : ""}.`}
          </p>
        </div>
        <LogoutButton />
      </div>

      {appointments.length > 0 ? (
        <div className="mt-8 flex flex-col gap-4">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="bg-soft-stone rounded-sm p-5 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-lg tracking-tight text-primary">
                    {a.doctor.name}
                  </h3>
                  <span
                    className={`text-xs rounded-full px-2.5 py-0.5 font-semibold ${
                      statusStyles[a.status] ?? "bg-soft-stone"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-body-muted mt-0.5">
                  {a.doctor.specialization}
                </p>
                <p className="text-sm text-ink mt-2">
                  {a.appointmentDate.toISOString().slice(0, 10)} · {a.startTime} – {a.endTime}
                </p>
                {a.paymentAmount ? (
                  <p className="text-xs text-body-muted mt-1">
                    ₹{a.paymentAmount} · {a.paymentStatus}
                  </p>
                ) : null}
                {pendingSet.has(a.id) ? (
                  <p className="text-xs text-action-blue font-semibold mt-1">
                    Reschedule request pending approval
                  </p>
                ) : null}
              </div>
              {a.status === "CONFIRMED" || a.status === "PENDING" ? (
                <div className="flex flex-col items-end gap-2">
                  <CancelButton appointmentId={a.id} />
                  <RescheduleForm
                    appointmentId={a.id}
                    doctorId={a.doctor.id}
                    currentDate={a.appointmentDate.toISOString().slice(0, 10)}
                    currentTime={a.startTime}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10">
          <Button href="/doctors" variant="primary" className="px-6 py-3 text-sm">
            Book your first appointment
          </Button>
        </div>
      )}
    </div>
  );
}
