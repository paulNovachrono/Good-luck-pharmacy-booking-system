"use client";

import { useEffect, useState } from "react";

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

export default function RescheduleForm({
  appointmentId,
  doctorId,
  currentDate,
  currentTime,
}: {
  appointmentId: string;
  doctorId: string;
  currentDate: string;
  currentTime: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startTime, setStartTime] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function openForm() {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    setDate(tomorrow.toISOString().slice(0, 10));
    setOpen(true);
  }

  const loadKey = open && date ? `${doctorId}|${date}` : "";
  const [prevKey, setPrevKey] = useState("");
  if (prevKey !== loadKey) {
    setPrevKey(loadKey);
    setSlots([]);
    setStartTime("");
    setMessage(null);
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
    setMessage(null);
    if (!date || !startTime) {
      setMessage({ ok: false, text: "Pick a new date and time." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime, reason }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error ?? "Request failed." });
        return;
      }
      setMessage({ ok: true, text: "Reschedule request sent. An admin will confirm it." });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={openForm}
        className="text-sm text-action-blue hover:underline font-medium cursor-pointer"
      >
        Reschedule
      </button>
    );
  }

  const fieldCls =
    "w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm focus:outline-none focus:border-focus-blue";

  return (
    <form onSubmit={submit} className="mt-3 bg-white border border-hairline rounded-md p-4 space-y-3">
      <p className="text-xs text-body-muted">
        Currently {currentDate} at {currentTime}. Pick a new slot:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-body-muted font-semibold block mb-1">New date</label>
          <input type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-body-muted font-semibold block mb-1">New time</label>
          <select className={fieldCls} value={startTime} onChange={(e) => setStartTime(e.target.value)}>
            <option value="">Select time</option>
            {slots.map((s) => (
              <option key={s.id} value={s.startTime}>
                {s.startTime} – {s.endTime}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-body-muted font-semibold block mb-1">Reason (optional)</label>
        <input className={fieldCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you need to move?" />
      </div>
      {message ? (
        <p className={`text-sm ${message.ok ? "text-deep-green" : "text-error"}`}>{message.text}</p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-deep-green text-white text-sm font-semibold px-4 py-2 hover:bg-primary disabled:opacity-40 transition-colors cursor-pointer"
        >
          {busy ? "Sending…" : "Request reschedule"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-body-muted hover:text-ink font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
