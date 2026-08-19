"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  consultationFee: number;
  experience: number | null;
  rating: number | null;
  city: string | null;
  isActive: boolean;
  _count: { appointments: number };
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: unknown[] } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/doctors");
      const data = await res.json();
      setDoctors(data.doctors ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  async function toggleActive(d: Doctor) {
    setMessage(null);
    const res = await fetch(`/api/admin/doctors/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    if (!res.ok) {
      setMessage({ ok: false, text: "Failed to update." });
      return;
    }
    setMessage({ ok: true, text: `${d.name} is now ${!d.isActive ? "active" : "inactive"}.` });
    fetchDoctors();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      const rows = parsed.data.map((r) => ({
        name: r.name?.trim(),
        specialization: r.specialization?.trim(),
        consultationFee: r.consultationFee,
        description: r.description ?? "",
        imageUrl: r.imageUrl ?? "",
        experience: r.experience ? Number(r.experience) : null,
        city: r.city ?? "",
      }));
      const res = await fetch("/api/admin/doctors/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Import failed." });
      } else {
        setResult(data);
        fetchDoctors();
      }
    } catch {
      setMessage({ ok: false, text: "Could not read the file." });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-primary">Doctors</h1>
          <p className="text-sm text-body-muted mt-1">{doctors.length} doctors</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="rounded-full border border-hairline text-sm font-semibold px-5 py-2.5 hover:bg-soft-stone transition-colors cursor-pointer">
            {importing ? "Importing…" : "Import CSV"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={importing} />
          </label>
          <Link
            href="/admin/doctors/new"
            className="rounded-full bg-deep-green text-white text-sm font-semibold px-5 py-2.5 hover:bg-primary transition-colors"
          >
            + Add doctor
          </Link>
        </div>
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

      {result ? (
        <div className="mt-4 text-sm rounded-md px-4 py-3 bg-pale-blue text-action-blue">
          Imported {result.created} doctor{result.created === 1 ? "" : "s"}.
          {result.errors.length > 0 ? ` ${result.errors.length} row(s) skipped.` : ""}
          {result.errors.length > 0 ? (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer">View skipped rows</summary>
              <pre className="mt-1 whitespace-pre-wrap">
                {JSON.stringify(result.errors, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-body-muted">
        CSV columns: name, specialization, consultationFee, experience, city, description, imageUrl.{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            const csv =
              "name,specialization,consultationFee,experience,city,description,imageUrl\n" +
              "Dr. Sample,General Physician,300,12,Mumbai,Clinic description,https://example.com/photo.jpg";
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "doctors-template.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="underline hover:text-ink"
        >
          Download template
        </a>
      </p>

      <div className="mt-6 bg-white border border-hairline rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-body-muted uppercase tracking-wide border-b border-hairline">
              <th className="px-5 py-3">Doctor</th>
              <th className="px-5 py-3">Specialization</th>
              <th className="px-5 py-3">Fee</th>
              <th className="px-5 py-3">Appointments</th>
              <th className="px-5 py-3">Status</th>
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
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-body-muted">
                  No doctors yet.
                </td>
              </tr>
            ) : (
              doctors.map((d) => (
                <tr key={d.id} className="hover:bg-soft-stone/50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/doctors/${d.id}`} className="font-medium text-primary hover:underline">
                      {d.name}
                    </Link>
                    {d.experience ? (
                      <p className="text-xs text-body-muted">{d.experience} yrs exp</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-body-muted">{d.specialization}</td>
                  <td className="px-5 py-3">₹{d.consultationFee}</td>
                  <td className="px-5 py-3 text-body-muted">{d._count.appointments}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs rounded-full px-2.5 py-0.5 font-semibold ${
                        d.isActive ? "bg-pale-green text-deep-green" : "bg-soft-stone text-body-muted"
                      }`}
                    >
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/doctors/${d.id}`}
                        className="text-xs font-semibold rounded-full px-3 py-1 border border-hairline hover:bg-soft-stone transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => toggleActive(d)}
                        className={`text-xs font-semibold rounded-full px-3 py-1 border transition-colors cursor-pointer ${
                          d.isActive
                            ? "border-hairline text-error hover:bg-soft-stone"
                            : "border-deep-green text-deep-green hover:bg-pale-green"
                        }`}
                      >
                        {d.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
