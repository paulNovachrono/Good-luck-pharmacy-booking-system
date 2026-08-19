import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma, Role } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DAYS = [
  { dayOfWeek: 1, startTime: "10:00", endTime: "14:00" },
  { dayOfWeek: 2, startTime: "10:00", endTime: "14:00" },
  { dayOfWeek: 3, startTime: "10:00", endTime: "14:00" },
  { dayOfWeek: 4, startTime: "10:00", endTime: "14:00" },
  { dayOfWeek: 5, startTime: "10:00", endTime: "14:00" },
  { dayOfWeek: 6, startTime: "10:00", endTime: "13:00" },
];

const SAMPLE_DOCTORS = [
  {
    name: "Dr. Ananya Sen",
    specialization: "General Physician",
    description: "Family medicine and preventive care specialist.",
    consultationFee: 800,
    advanceDiscount: 100,
    experience: 12,
    rating: 4.8,
    city: "Kolkata",
  },
  {
    name: "Dr. Rohan Mehta",
    specialization: "Cardiologist",
    description: "Preventive cardiology and hypertension management.",
    consultationFee: 1500,
    advanceDiscount: 200,
    experience: 18,
    rating: 4.9,
    city: "Kolkata",
  },
  {
    name: "Dr. Priya Nair",
    specialization: "Dermatologist",
    description: "Clinical and aesthetic dermatology.",
    consultationFee: 1200,
    advanceDiscount: 150,
    experience: 10,
    rating: 4.7,
    city: "Kolkata",
  },
  {
    name: "Dr. Arjun Bose",
    specialization: "Pediatrician",
    description: "Child health, vaccination and growth monitoring.",
    consultationFee: 900,
    advanceDiscount: 100,
    experience: 9,
    rating: 4.8,
    city: "Kolkata",
  },
];

const DEFAULT_SETTINGS: Record<string, unknown> = {
  clinicName: "Green Leaf Polyclinic",
  clinicAddress: "Park Street, Kolkata",
  clinicPhone: "+919999999999",
  appointmentDurationMinutes: 30,
  advancePaymentEnabled: true,
  advancePaymentPercent: 50,
  mockPayments: true,
  mockWhatsapp: true,
  defaultSlotDuration: 30,
  razorpayKeyId: "",
  razorpayKeySecret: "",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioWhatsappFrom: "",
  whatsappNotifyBooked: true,
  whatsappNotifyReschedule: true,
  whatsappNotifyReminderHours: 24,
  whatsappNotifyCancelled: true,
  slotGenerationWeeks: 2,
  bufferMinutesBetweenSlots: 0,
  businessHours: { mondayToFriday: "10:00-14:00", saturday: "10:00-13:00", sunday: null },
};

async function main() {
  const adminPhone = process.env.SEED_ADMIN_PHONE || "+919999999999";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@glp.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const adminName = process.env.SEED_ADMIN_NAME || "Super Admin";

  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {},
    create: {
      name: adminName,
      phone: adminPhone,
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: Role.SUPER_ADMIN,
    },
  });

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as Prisma.InputJsonValue },
    });
  }

  for (const d of SAMPLE_DOCTORS) {
    const existing = await prisma.doctor.findFirst({ where: { name: d.name } });
    if (existing) continue;

    await prisma.doctor.create({
      data: {
        ...d,
        createdById: admin.id,
        availability: {
          create: DAYS.map((day) => ({ ...day, slotDuration: 30 })),
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log(`  Super admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Sample doctors seeded with availability.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
