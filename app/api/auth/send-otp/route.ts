import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";

const schema = z.object({
  phone: z.string().min(8).max(15),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid phone number." }, { status: 400 });
  }

  const phone = body.data.phone;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (!existing) {
    await prisma.user.create({ data: { phone } });
  }

  const code = await createOtp(phone);
  const isMock = process.env.MOCK_WHATSAPP !== "false";

  return Response.json({
    sent: true,
    mock: isMock,
    devCode: isMock ? code : undefined,
  });
}
