"use client";

import { useCallback, useEffect, useState } from "react";

interface Doctor {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  paymentAmount: number | null;
  bookingMethod: string;
  patientName: string | null;
  patientPhone: string | null;
  notes: string | null;
  user: { name: string | null; phone: string } | null;
  doctor: { id: string; name: string; specialization: string };
  rescheduleRequest: { status: string } | null;
}

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-pale-green text-deep-green",
  PENDING: "bg-pale-blue text-action-blue",
  COMPLETED: "bg-soft-stone text-body-muted",
  CANCELLED: "bg-soft-stone text-error",
  NO_SHOW: "bg-soft-stone text-error",
};

function Chip({ status }: { status: string }) {
  return (
    <span className={`text-xs rounded-full px-2.5 py-0.5 font-semibold ${STATUS_STYLES[status] ?? "bg-soft-stone"}`}>
      {status}
    </span>
  );
}

const inputCls =
  "w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm focus:outline-none focus:border-focus-blue";

export default function AdminAppointmentsPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [doctorId, setDoctorId] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({});

  const [bookOpen, setBookOpen] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(applied as Record<string, string>),
      });
      const res = await fetch(`/api/admin/appointments?${params}`);
      const data = await res.json();
      setRows(data.appointments ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    fetch("/api/admin/doctors")
      .then((r) => r.json())
      .then((d) => setDoctors(d.doctors ?? []))
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    const next: Record<string, string> = {};
    if (q.trim()) next.q = q.trim();
    if (status !== "ALL") next.status = status;
    if (doctorId !== "ALL") next.doctorId = doctorId;
    if (from) next.from = from;
    if (to) next.to = to;
    setApplied(next);
  }

  async function changeStatus(id: string, nextStatus: string) {
    setMessage(null);
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setMessage({ ok: false, text: d?.error ?? "Failed to update." });
      return;
    }
    setMessage({ ok: true, text: `Marked ${nextStatus}.` });
    fetchRows();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-primary">Appointments</h1>
          <p className="text-sm text-body-muted mt-1">{total} total</p>
        </div>
        <button
          onClick={() => setBookOpen(true)}
          className="rounded-full bg-deep-green text-white text-sm font-semibold px-5 py-2.5 hover:bg-primary transition-colors cursor-pointer"
        >
          + Book on behalf
        </button>
      </div>

      {message ? (
        <div
          className={`mt-4 text-sm rounded-md px-4 py-3 ${
            message.ok ? "bg-pale-green text-deep-green" : "bg-soft-stone text-error"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={applyFilters} className="mt-6 bg-white border border-hairline rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <input className={inputCls} placeholder="Search patient / doctor" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option>PENDING</option>
          <option>CONFIRMED</option>
          <option>COMPLETED</option>
          <option>CANCELLED</option>
          <option>NO_SHOW</option>
        </select>
        <select className={inputCls} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="ALL">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="col-span-2 md:col-span-5 flex justify-end">
          <button type="submit" className="rounded-full border border-hairline text-sm font-semibold px-5 py-2 hover:bg-soft-stone transition-colors cursor-pointer">
            Apply filters
          </button>
        </div>
      </form>

      <div className="mt-6 bg-white border border-hairline rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-body-muted uppercase tracking-wide border-b border-hairline">
              <th className="px-5 py-3">Patient</th>
              <th className="px-5 py-3">Doctor</th>
              <th className="px-5 py-3">Date &amp; time</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-body-muted">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-body-muted">
                  No appointments found.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="hover:bg-soft-stone/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-primary">{a.user?.name ?? a.patientName ?? "—"}</p>
                    <p className="text-xs text-body-muted">{a.user?.phone ?? a.patientPhone ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-primary">{a.doctor.name}</p>
                    <p className="text-xs text-body-muted">{a.doctor.specialization}</p>
                  </td>
                  <td className="px-5 py-3 text-body-muted">
                    {a.appointmentDate.slice(0, 10)}
                    <br />
                    {a.startTime} – {a.endTime}
                  </td>
                  <td className="px-5 py-3">
                    <Chip status={a.status} />
                    {a.rescheduleRequest?.status === "PENDING" ? (
                      <span className="block mt-1 text-[10px] text-action-blue font-semibold">Reschedule requested</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-body-muted">
                    {a.paymentAmount ? `₹${a.paymentAmount}` : "—"}
                    <span className="block text-xs">{a.paymentStatus}</span>
                  </td>
                  <td className="px-5 py-3">
                    {a.status === "PENDING" ? (
                      <div className="flex flex-wrap gap-2">
                        <ActionBtn label="Confirm" onClick={() => changeStatus(a.id, "CONFIRMED")} />
                        <ActionBtn label="Cancel" danger onClick={() => changeStatus(a.id, "CANCELLED")} />
                      </div>
                    ) : a.status === "CONFIRMED" ? (
                      <div className="flex flex-wrap gap-2">
                        <ActionBtn label="Complete" onClick={() => changeStatus(a.id, "COMPLETED")} />
                        <ActionBtn label="No-show" onClick={() => changeStatus(a.id, "NO_SHOW")} />
                        <ActionBtn label="Cancel" danger onClick={() => changeStatus(a.id, "CANCELLED")} />
                      </div>
                    ) : (
                      <span className="text-xs text-body-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-body-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-full border border-hairline px-4 py-1.5 font-medium disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-hairline px-4 py-1.5 font-medium disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {bookOpen ? <BookModal onClose={() => setBookOpen(false)} onBooked={() => { setBookOpen(false); fetchRows(); }} /> : null}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold rounded-full px-3 py-1 border transition-colors cursor-pointer ${
        danger
          ? "border-hairline text-error hover:bg-soft-stone"
          : "border-deep-green text-deep-green hover:bg-pale-green"
      }`}
    >
      {label}
    </button>
  );
}

function BookModal({ onClose, onBooked }: { onClose: () => void; onBooked: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startTime, setStartTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/doctors")
      .then((r) => r.json())
      .then((d) => {
        setDoctors(d.doctors ?? []);
        setDoctorId((prev) => prev || d.doctors?.[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  const loadKey = doctorId && date ? `${doctorId}|${date}` : "";
  const [prevKey, setPrevKey] = useState("");
  if (prevKey !== loadKey) {
    setPrevKey(loadKey);
    setSlots([]);
    setStartTime("");
  }

  useEffect(() => {
    if (!loadKey) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/public/doctors/${doctorId}/slots?date=${date}`);
        const data = await res.json();
        if (cancelled) return;
        setSlots(data.slots ?? []);
      } catch {
        if (cancelled) return;
        setSlots([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadKey, doctorId, date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!doctorId || !date || !startTime || !name.trim() || !phone.trim()) {
      setError("Doctor, date, time, patient name and phone are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, date, startTime, patientName: name, patientPhone: phone, notes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Booking failed.");
        return;
      }
      onBooked();
    } finally {
      setBusy(false);
    }
  }

  const fieldCls =
    "w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm focus:outline-none focus:border-focus-blue";

  return (
    <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-primary">Book appointment for patient</h2>
          <button onClick={onClose} className="text-body-muted hover:text-ink cursor-pointer">
            ✕
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}

        <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-body-muted font-semibold block mb-1">Doctor</label>
            <select className={fieldCls} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">Date</label>
            <input type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">Time slot</label>
            <select className={fieldCls} value={startTime} onChange={(e) => setStartTime(e.target.value)}>
              <option value="">Select time</option>
              {slots.map((s) => (
                <option key={s.id} value={s.startTime}>
                  {s.startTime} – {s.endTime}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">Patient name</label>
            <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">Phone</label>
            <input className={fieldCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXX00" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-body-muted font-semibold block mb-1">Notes (optional)</label>
            <input className={fieldCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-hairline px-5 py-2 text-sm font-semibold hover:bg-soft-stone cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-deep-green text-white px-5 py-2 text-sm font-semibold hover:bg-primary disabled:opacity-40 cursor-pointer"
            >
              {busy ? "Booking…" : "Book appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
