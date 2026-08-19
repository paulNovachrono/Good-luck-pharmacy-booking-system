import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

async function sendOtp(target: string, code: string): Promise<void> {
  if (process.env.MOCK_WHATSAPP !== "false") {
    console.log(`[MOCK-OTP] ${target}: ${code}`);
    return;
  }
  // TODO: real SMS/WhatsApp delivery once Twilio keys are configured via Settings.
}

export async function createOtp(target: string): Promise<string> {
  const code = generateOtpCode();
  await prisma.otp.create({
    data: {
      target,
      codeHash: hashOtp(code),
      type: "LOGIN",
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  await sendOtp(target, code);
  return code;
}

export async function verifyOtp(target: string, code: string): Promise<boolean> {
  const otp = await prisma.otp.findFirst({
    where: { target, used: false },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  if (otp.expiresAt < new Date()) return false;
  if (otp.attempts >= MAX_ATTEMPTS) return false;

  const valid = otp.codeHash === hashOtp(code);
  await prisma.otp.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 }, used: valid },
  });
  return valid;
}
