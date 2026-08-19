import { requireAdmin } from "@/lib/admin";
import DoctorForm from "@/components/admin/doctor-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add Doctor",
};

export default async function NewDoctorPage() {
  await requireAdmin();

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-primary">Add doctor</h1>
        <p className="text-sm text-body-muted mt-1">Create a new doctor and set their availability.</p>
      </div>
      <DoctorForm />
    </div>
  );
}
