"use client";

import { useCallback, useEffect, useState } from "react";

interface Patient {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  whatsappOptIn: boolean;
  createdAt: string;
  _count: { appointments: number };
  appointments: { appointmentDate: string }[];
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    try {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/admin/patients${params}`);
      const data = await res.json();
      setPatients(data.patients ?? []);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(fetchPatients, 250);
    return () => clearTimeout(t);
  }, [fetchPatients]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-primary">Patients</h1>
          <p className="text-sm text-body-muted mt-1">{patients.length} registered</p>
        </div>
        <input
          className="rounded-md border border-hairline bg-white px-3 py-2 text-sm focus:outline-none focus:border-focus-blue w-64"
          placeholder="Search name, phone or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mt-6 bg-white border border-hairline rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-body-muted uppercase tracking-wide border-b border-hairline">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Appointments</th>
              <th className="px-5 py-3">Last visit</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-body-muted">
                  Loading…
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-body-muted">
                  No patients found.
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="hover:bg-soft-stone/50">
                  <td className="px-5 py-3 font-medium text-primary">{p.name ?? "—"}</td>
                  <td className="px-5 py-3 text-body-muted">{p.phone}</td>
                  <td className="px-5 py-3 text-body-muted">{p.email ?? "—"}</td>
                  <td className="px-5 py-3">{p._count.appointments}</td>
                  <td className="px-5 py-3 text-body-muted">
                    {p.appointments[0]?.appointmentDate.slice(0, 10) ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-body-muted">{p.createdAt.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
