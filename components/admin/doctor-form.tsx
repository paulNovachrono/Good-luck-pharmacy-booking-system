"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvailabilityEditor, {
  defaultAvailability,
  type Availability,
} from "./availability-editor";

export interface DoctorFormData {
  name: string;
  specialization: string;
  description: string;
  imageUrl: string;
  consultationFee: number;
  advanceDiscount: number;
  experience: string;
  rating: string;
  city: string;
  isActive: boolean;
  availability: Availability[];
}

const fieldCls =
  "w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm focus:outline-none focus:border-focus-blue";

export default function DoctorForm({
  doctorId,
  initial,
}: {
  doctorId?: string;
  initial?: DoctorFormData;
}) {
  const router = useRouter();
  const [data, setData] = useState<DoctorFormData>(
    initial ?? {
      name: "",
      specialization: "",
      description: "",
      imageUrl: "",
      consultationFee: 300,
      advanceDiscount: 0,
      experience: "",
      rating: "",
      city: "",
      isActive: true,
      availability: defaultAvailability(),
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof DoctorFormData>(key: K, value: DoctorFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!data.name.trim() || !data.specialization.trim()) {
      setError("Name and specialization are required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: data.name,
        specialization: data.specialization,
        description: data.description,
        imageUrl: data.imageUrl,
        consultationFee: Number(data.consultationFee),
        advanceDiscount: Number(data.advanceDiscount),
        experience: data.experience ? Number(data.experience) : null,
        rating: data.rating ? Number(data.rating) : null,
        city: data.city,
        isActive: data.isActive,
      };

      let id = doctorId;
      if (id) {
        const res = await fetch(`/api/admin/doctors/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          setError(d?.error ?? "Failed to save.");
          return;
        }
      } else {
        const res = await fetch("/api/admin/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, availability: data.availability }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok) {
          setError(d?.error ?? "Failed to create.");
          return;
        }
        id = d.doctor.id;
      }

      const availRes = await fetch(`/api/admin/doctors/${id}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: data.availability }),
      });
      if (!availRes.ok) {
        setError("Doctor saved, but availability could not be updated.");
        return;
      }

      router.push("/admin/doctors");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-hairline rounded-lg p-6 space-y-4">
        <h3 className="font-display text-sm font-semibold text-primary">Details</h3>

        {error ? <p className="text-sm text-error">{error}</p> : null}

        <div>
          <label className="text-xs text-body-muted font-semibold block mb-1">Full name *</label>
          <input className={fieldCls} value={data.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-body-muted font-semibold block mb-1">Specialization *</label>
          <input className={fieldCls} value={data.specialization} onChange={(e) => set("specialization", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-body-muted font-semibold block mb-1">Description</label>
          <textarea
            className={`${fieldCls} min-h-24`}
            value={data.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-body-muted font-semibold block mb-1">Photo URL</label>
          <input className={fieldCls} value={data.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">Consultation fee (₹) *</label>
            <input
              type="number"
              min={0}
              className={fieldCls}
              value={data.consultationFee}
              onChange={(e) => set("consultationFee", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">Advance discount %</label>
            <input
              type="number"
              min={0}
              max={100}
              className={fieldCls}
              value={data.advanceDiscount}
              onChange={(e) => set("advanceDiscount", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">Experience (years)</label>
            <input className={fieldCls} value={data.experience} onChange={(e) => set("experience", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">Rating (0–5)</label>
            <input className={fieldCls} value={data.rating} onChange={(e) => set("rating", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-body-muted font-semibold block mb-1">City</label>
            <input className={fieldCls} value={data.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={data.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="accent-deep-green h-4 w-4"
              />
              Active (visible for booking)
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-hairline rounded-lg p-6">
        <h3 className="font-display text-sm font-semibold text-primary mb-4">Weekly availability</h3>
        <AvailabilityEditor value={data.availability} onChange={(availability) => set("availability", availability)} />
      </div>

      <div className="lg:col-span-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/doctors")}
          className="rounded-full border border-hairline px-6 py-2.5 text-sm font-semibold hover:bg-soft-stone transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-deep-green text-white px-6 py-2.5 text-sm font-semibold hover:bg-primary disabled:opacity-40 transition-colors cursor-pointer"
        >
          {busy ? "Saving…" : doctorId ? "Save changes" : "Create doctor"}
        </button>
      </div>
    </form>
  );
}
