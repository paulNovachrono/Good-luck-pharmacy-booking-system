"use client";

import { useCallback, useEffect, useState } from "react";

interface RequestRow {
  id: string;
  reason: string | null;
  adminNotes: string | null;
  status: string;
  createdAt: string;
  user: { name: string | null; phone: string } | null;
  appointment: {
    id: string;
    appointmentDate: string;
    startTime: string;
    status: string;
    doctor: { id: string; name: string };
  };
  requestedSlot: { date: string; startTime: string; endTime: string; isBooked: boolean } | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-pale-blue text-action-blue",
  APPROVED: "bg-pale-green text-deep-green",
  REJECTED: "bg-soft-stone text-error",
};

export default function AdminReschedulesPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reschedules");
      const data = await res.json();
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function act(id: string, action: "APPROVED" | "REJECTED") {
    setMessage(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reschedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes: notes[id] || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error ?? "Action failed." });
        return;
      }
      setMessage({ ok: true, text: `Request ${action === "APPROVED" ? "approved" : "rejected"}.` });
      fetchRequests();
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const handled = requests.filter((r) => r.status !== "PENDING");

  function renderList(list: RequestRow[], showActions: boolean) {
    if (list.length === 0) {
      return (
        <p className="px-5 py-6 text-sm text-body-muted">
          {showActions ? "No pending reschedule requests." : "No handled requests yet."}
        </p>
      );
    }
    return (
      <ul className="divide-y divide-hairline">
        {list.map((r) => (
          <li key={r.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">
                  {r.user?.name ?? r.user?.phone ?? "Patient"}
                </p>
                <p className="text-xs text-body-muted mt-0.5">
                  {r.appointment.doctor.name} · currently {r.appointment.appointmentDate.slice(0, 10)}{" "}
                  {r.appointment.startTime}
                </p>
              </div>
              <span
                className={`text-xs rounded-full px-2.5 py-0.5 font-semibold ${
                  STATUS_STYLES[r.status] ?? "bg-soft-stone"
                }`}
              >
                {r.status}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-body-muted">Wants:</span>
              {r.requestedSlot ? (
                <span className="font-semibold text-deep-green">
                  {r.requestedSlot.date.slice(0, 10)} · {r.requestedSlot.startTime} –{" "}
                  {r.requestedSlot.endTime}
                </span>
              ) : (
                <span className="text-body-muted">To be contacted</span>
              )}
              {r.requestedSlot?.isBooked ? (
                <span className="text-xs text-error font-semibold">(slot now unavailable)</span>
              ) : null}
            </div>

            {r.reason ? (
              <p className="mt-2 text-sm text-body-muted bg-soft-stone rounded-md px-3 py-2">
                “{r.reason}”
              </p>
            ) : null}

            {showActions ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  className="rounded-md border border-hairline bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-focus-blue w-64"
                  placeholder="Admin notes (optional)"
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <button
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, "APPROVED")}
                  className="rounded-full bg-deep-green text-white text-xs font-semibold px-4 py-1.5 hover:bg-primary disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, "REJECTED")}
                  className="rounded-full border border-hairline text-xs font-semibold px-4 py-1.5 text-error hover:bg-soft-stone disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Reject
                </button>
              </div>
            ) : null}

            {r.adminNotes ? (
              <p className="mt-2 text-xs text-body-muted">Note: {r.adminNotes}</p>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl tracking-tight text-primary">Reschedule requests</h1>
        <p className="text-sm text-body-muted mt-1">
          {pending.length} pending · {handled.length} handled
        </p>
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

      {loading ? (
        <p className="mt-6 text-sm text-body-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-6 bg-white border border-hairline rounded-lg">
            <div className="px-5 py-4 border-b border-hairline">
              <h3 className="font-display text-sm font-semibold text-primary">Pending</h3>
            </div>
            {renderList(pending, true)}
          </div>

          <div className="mt-6 bg-white border border-hairline rounded-lg">
            <div className="px-5 py-4 border-b border-hairline">
              <h3 className="font-display text-sm font-semibold text-primary">Handled</h3>
            </div>
            {renderList(handled, false)}
          </div>
        </>
      )}
    </div>
  );
}
