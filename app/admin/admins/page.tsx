"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminUser {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string;
  createdAt: string;
  _count: { createdDoctors: number };
}

const fieldCls =
  "w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm focus:outline-none focus:border-focus-blue";

export default function AdminAdminsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meRole, setMeRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [busy, setBusy] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users ?? []);
      setMeRole(data.me?.role ?? "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error ?? "Failed to create." });
        return;
      }
      setMessage({ ok: true, text: `${name} can now log in with phone ${phone} (OTP).` });
      setName("");
      setPhone("");
      setEmail("");
      setRole("ADMIN");
      fetchUsers();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-primary">Admins</h1>
        <p className="text-sm text-body-muted mt-1">
          Admins log in with the same OTP flow — enter their phone on the login page.
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

      <div className="mt-6 bg-white border border-hairline rounded-lg">
        <div className="px-5 py-4 border-b border-hairline">
          <h3 className="font-display text-sm font-semibold text-primary">Team</h3>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-body-muted">Loading…</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {users.map((u) => (
              <li key={u.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">{u.name ?? u.phone}</p>
                  <p className="text-xs text-body-muted">{u.phone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs rounded-full px-2.5 py-0.5 font-semibold ${
                      u.role === "SUPER_ADMIN" ? "bg-pale-green text-deep-green" : "bg-pale-blue text-action-blue"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {meRole === "SUPER_ADMIN" ? (
        <form onSubmit={create} className="mt-6 bg-white border border-hairline rounded-lg p-6">
          <h3 className="font-display text-sm font-semibold text-primary mb-4">Add admin</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-body-muted font-semibold block mb-1">Name</label>
              <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-body-muted font-semibold block mb-1">Phone</label>
              <input className={fieldCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" required />
            </div>
            <div>
              <label className="text-xs text-body-muted font-semibold block mb-1">Role</label>
              <select className={fieldCls} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-body-muted font-semibold block mb-1">Email (optional)</label>
            <input className={fieldCls} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-deep-green text-white px-6 py-2.5 text-sm font-semibold hover:bg-primary disabled:opacity-40 transition-colors cursor-pointer"
            >
              {busy ? "Adding…" : "Add admin"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
