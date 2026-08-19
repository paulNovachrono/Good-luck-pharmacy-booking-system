"use client";

import { useEffect, useState } from "react";

const META: Record<
  string,
  { label: string; type: "text" | "number" | "boolean"; secret?: boolean; help?: string }
> = {
  clinicName: { label: "Clinic name", type: "text" },
  clinicAddress: { label: "Clinic address", type: "text" },
  clinicPhone: { label: "Clinic phone", type: "text" },
  clinicEmail: { label: "Clinic email", type: "text" },
  advancePaymentEnabled: { label: "Advance payment enabled", type: "boolean" },
  advancePaymentPercent: { label: "Advance payment %", type: "number" },
  defaultSlotDuration: { label: "Default slot duration (min)", type: "number" },
  mockPayments: {
    label: "Mock payments (demo mode)",
    type: "boolean",
    help: "When on, bookings skip real payment.",
  },
  mockWhatsapp: {
    label: "Mock WhatsApp (demo mode)",
    type: "boolean",
    help: "When on, WhatsApp messages are simulated.",
  },
  razorpayKeyId: { label: "Razorpay Key ID", type: "text", secret: true },
  razorpayKeySecret: { label: "Razorpay Key Secret", type: "text", secret: true },
  twilioAccountSid: { label: "Twilio Account SID", type: "text", secret: true },
  twilioAuthToken: { label: "Twilio Auth Token", type: "text", secret: true },
  twilioWhatsappFrom: { label: "Twilio WhatsApp from number", type: "text", secret: true },
};

const fieldCls =
  "w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm focus:outline-none focus:border-focus-blue";

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(d.settings ?? {})) {
          map[k] = typeof v === "boolean" ? (v ? "true" : "false") : String(v ?? "");
        }
        setValues(map);
      })
      .finally(() => setLoading(false));
  }, []);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const payload: Record<string, string | number | boolean> = {};
      for (const [key, meta] of Object.entries(META)) {
        const raw = values[key] ?? "";
        if (meta.type === "boolean") payload[key] = raw === "true";
        else if (meta.type === "number") payload[key] = raw === "" ? 0 : Number(raw);
        else payload[key] = raw;
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error ?? "Failed to save." });
        return;
      }
      setMessage({ ok: true, text: "Settings saved." });
    } finally {
      setSaving(false);
    }
  }

  const groups: { title: string; keys: string[] }[] = [
    { title: "Clinic", keys: ["clinicName", "clinicAddress", "clinicPhone", "clinicEmail"] },
    { title: "Booking", keys: ["advancePaymentEnabled", "advancePaymentPercent", "defaultSlotDuration", "mockPayments", "mockWhatsapp"] },
    { title: "Razorpay (payments)", keys: ["razorpayKeyId", "razorpayKeySecret"] },
    { title: "Twilio (WhatsApp)", keys: ["twilioAccountSid", "twilioAuthToken", "twilioWhatsappFrom"] },
  ];

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl tracking-tight text-primary">Settings</h1>
        <p className="text-sm text-body-muted mt-1">
          Clinic info and integrations. Keep secret keys safe — they are stored in the database.
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
        <form onSubmit={save} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          {groups.map((group) => (
            <div key={group.title} className="bg-white border border-hairline rounded-lg p-6">
              <h3 className="font-display text-sm font-semibold text-primary mb-4">{group.title}</h3>
              <div className="space-y-4">
                {group.keys.map((key) => {
                  const meta = META[key];
                  const value = values[key] ?? "";
                  return (
                    <div key={key}>
                      <label className="text-xs text-body-muted font-semibold block mb-1">
                        {meta.label}
                        {meta.secret ? " *" : ""}
                      </label>
                      {meta.type === "boolean" ? (
                        <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value === "true"}
                            onChange={(e) => set(key, String(e.target.checked))}
                            className="accent-deep-green h-4 w-4"
                          />
                          {value === "true" ? "Enabled" : "Disabled"}
                        </label>
                      ) : (
                        <input
                          type={meta.secret ? "password" : meta.type === "number" ? "number" : "text"}
                          className={fieldCls}
                          value={value}
                          placeholder={meta.secret ? "••••••••" : ""}
                          onChange={(e) => set(key, e.target.value)}
                        />
                      )}
                      {meta.help ? <p className="text-xs text-body-muted mt-1">{meta.help}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-deep-green text-white px-6 py-2.5 text-sm font-semibold hover:bg-primary disabled:opacity-40 transition-colors cursor-pointer"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
