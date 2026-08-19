import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, writeAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const SETTING_META: Record<
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
  mockPayments: { label: "Mock payments (demo mode)", type: "boolean", help: "When on, bookings skip real payment." },
  mockWhatsapp: { label: "Mock WhatsApp (demo mode)", type: "boolean", help: "When on, WhatsApp messages are simulated." },
  razorpayKeyId: { label: "Razorpay Key ID", type: "text", secret: true },
  razorpayKeySecret: { label: "Razorpay Key Secret", type: "text", secret: true },
  twilioAccountSid: { label: "Twilio Account SID", type: "text", secret: true },
  twilioAuthToken: { label: "Twilio Auth Token", type: "text", secret: true },
  twilioWhatsappFrom: { label: "Twilio WhatsApp from number", type: "text", secret: true },
};

const patchSchema = z.record(z.string().min(1), z.union([z.string(), z.number(), z.boolean()]));

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const rows = await prisma.setting.findMany();
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }

  return Response.json({ settings: map });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest("Invalid settings payload.");

  const keys = Object.keys(body.data);

  await prisma.$transaction(async (tx) => {
    for (const key of keys) {
      const raw = body.data[key];
      let value: unknown = raw;
      const meta = SETTING_META[key];
      if (meta?.type === "number") {
        value = Number(raw);
      } else if (meta?.type === "boolean") {
        value = Boolean(raw);
      } else if (typeof raw === "string" && raw.trim() === "") {
        value = null;
      }
      await tx.setting.upsert({
        where: { key },
        create: { key, value: value as never },
        update: { value: value as never },
      });
    }
    await writeAudit(tx, admin.sub, "UPDATE_SETTINGS", "Setting", null, { keys });
  });

  return Response.json({ success: true });
}
