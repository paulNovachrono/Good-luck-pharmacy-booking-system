import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

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
