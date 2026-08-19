import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const p = new PrismaClient({ adapter });

async function main() {
  const doctorIds = [];
  for (const name of ["Dr. Smoke Tester", "Dr. Csv One", "Dr. Csv Two", "Dr. Csv Three", "Dr. Csv Four", "Dr. Csv Five"]) {
    const d = await p.doctor.findFirst({ where: { name } });
    if (d) doctorIds.push(d.id);
  }

  const smokeUser = await p.user.findFirst({ where: { phone: "+919000000001" } });
  const smokeAdmin = await p.user.findFirst({ where: { phone: "+919000000002" } });

  if (smokeUser) {
    await p.appointment.deleteMany({ where: { userId: smokeUser.id } });
    await p.user.delete({ where: { id: smokeUser.id } });
  }
  if (smokeAdmin) {
    await p.user.delete({ where: { id: smokeAdmin.id } });
  }
  if (doctorIds.length) {
    await p.doctor.deleteMany({ where: { id: { in: doctorIds } } });
  }

  const pending = await p.rescheduleRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
  for (const r of pending.slice(1)) {
    await p.rescheduleRequest.delete({ where: { id: r.id } });
  }

  console.log("Cleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
