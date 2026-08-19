"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!confirm("Cancel this appointment?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not cancel the appointment.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={cancel}
        disabled={loading}
        className="text-xs text-error font-semibold hover:underline disabled:opacity-40 cursor-pointer"
      >
        {loading ? "Cancelling…" : "Cancel appointment"}
      </button>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </span>
  );
}
