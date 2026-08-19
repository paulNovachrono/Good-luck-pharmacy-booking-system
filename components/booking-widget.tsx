"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

interface BookingWidgetProps {
  doctorId: string;
  consultationFee: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextDates(count: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${DAYS[d.getDay()]}, ${d.getDate()}`;
}

export default function BookingWidget({ doctorId, consultationFee }: BookingWidgetProps) {
  const router = useRouter();
  const dates = nextDates(7);

  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [prevDate, setPrevDate] = useState<Date>(dates[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState<{ date: string; time: string } | null>(null);

  if (prevDate !== selectedDate) {
    setPrevDate(selectedDate);
    setSlots([]);
    setSelectedSlot(null);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/public/doctors/${doctorId}/slots?date=${dateKey(selectedDate)}`
        );
        if (!res.ok) throw new Error("Failed to load slots.");
        const data = await res.json();
        if (cancelled) return;
        setError(null);
        setSlots(data.slots ?? []);
      } catch {
        if (cancelled) return;
        setError("Could not load available slots. Please try again.");
        setSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [doctorId, selectedDate]);

  async function reload() {
    try {
      const res = await fetch(
        `/api/public/doctors/${doctorId}/slots?date=${dateKey(selectedDate)}`
      );
      const data = await res.json();
      setError(null);
      setSlots(data.slots ?? []);
    } catch {
      setError("Could not load available slots. Please try again.");
    }
  }

  async function confirmBooking() {
    if (!selectedSlot) return;
    setBooking(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          date: dateKey(selectedDate),
          startTime: selectedSlot.startTime,
        }),
      });

      if (res.status === 401) {
        router.push(`/login?next=/doctors/${doctorId}`);
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Booking failed. Please try again.");
        if (res.status === 409) reload();
        return;
      }

      setDone({ date: dateKey(selectedDate), time: selectedSlot.startTime });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  if (done) {
    return (
      <div className="bg-pale-green rounded-sm p-8">
        <h2 className="font-display text-2xl tracking-tight text-primary">
          Appointment booked
        </h2>
        <p className="text-body-muted mt-2 text-sm">
          Your slot on <span className="text-ink font-medium">{done.date}</span> at{" "}
          <span className="text-ink font-medium">{done.time}</span> is confirmed.
          You will receive a WhatsApp reminder before your visit.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => router.push("/account")}
            className="rounded-full bg-deep-green text-on-primary px-6 py-3 text-sm font-semibold hover:bg-primary transition-colors cursor-pointer"
          >
            View My Appointments
          </button>
          <button
            onClick={() => {
              setDone(null);
              setSelectedSlot(null);
              reload();
            }}
            className="rounded-full border border-hairline px-6 py-3 text-sm font-semibold hover:bg-soft-stone transition-colors cursor-pointer"
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-soft-stone rounded-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl tracking-tight text-primary">
          Book an appointment
        </h2>
        <span className="text-sm text-ink font-semibold">₹{consultationFee}</span>
      </div>

      <p className="text-xs uppercase tracking-widest text-body-muted font-semibold mb-3">
        Pick a day
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {dates.map((d) => {
          const active = dateKey(d) === dateKey(selectedDate);
          return (
            <button
              key={dateKey(d)}
              onClick={() => setSelectedDate(d)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? "bg-deep-green text-on-primary"
                  : "bg-canvas border border-hairline text-body-muted hover:border-deep-green"
              }`}
            >
              {dayLabel(d)}
            </button>
          );
        })}
      </div>

      <p className="text-xs uppercase tracking-widest text-body-muted font-semibold mb-3">
        Pick a time
      </p>
      {loading ? (
        <p className="text-sm text-body-muted py-6">Loading slots…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-body-muted py-6">
          No slots available on this day.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
          {slots.map((s) => {
            const active = selectedSlot?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSlot(s)}
                className={`rounded-sm py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-deep-green text-on-primary"
                    : "bg-canvas border border-hairline text-ink hover:border-deep-green"
                }`}
              >
                {s.startTime}
              </button>
            );
          })}
        </div>
      )}

      {error ? (
        <p className="text-sm text-error mb-4">{error}</p>
      ) : null}

      <button
        onClick={confirmBooking}
        disabled={!selectedSlot || booking}
        className="w-full rounded-full bg-deep-green text-on-primary py-3.5 text-sm font-semibold hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {booking ? "Booking…" : selectedSlot ? `Confirm booking at ${selectedSlot.startTime}` : "Select a time slot"}
      </button>
      <p className="text-xs text-body-muted mt-3 text-center">
        You will be asked to log in with your phone number to confirm.
      </p>
    </div>
  );
}
