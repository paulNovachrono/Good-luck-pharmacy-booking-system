import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { createSession, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  phone: z.string().min(8).max(15),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid input." }, { status: 400 });
  }

  const { phone, code } = body.data;
  const ok = await verifyOtp(phone, code);
  if (!ok) {
    return Response.json({ error: "Invalid or expired code." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const token = await createSession({ sub: user.id, phone: user.phone, role: user.role });
  await setSessionCookie(token);

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
  });
}
