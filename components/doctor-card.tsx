import Link from "next/link";

interface DoctorCardProps {
  doctor: {
    id: string;
    name: string;
    specialization: string;
    consultationFee: number;
    experience?: number | null;
    rating?: number | null;
    city?: string | null;
  };
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <div className="bg-soft-stone rounded-sm p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-sm bg-deep-green/10 flex items-center justify-center text-deep-green font-display text-xl shrink-0">
          {doctor.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg tracking-tight text-primary truncate">
            {doctor.name}
          </h3>
          <p className="text-sm text-body-muted">{doctor.specialization}</p>
          {doctor.rating && (
            <span className="text-xs text-body-muted">{doctor.rating} ★</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {doctor.experience ? (
          <span className="text-xs bg-deep-green/10 text-deep-green rounded-full px-2.5 py-0.5">
            {doctor.experience} yrs exp
          </span>
        ) : null}
        {doctor.city ? (
          <span className="text-xs bg-soft-stone border border-hairline rounded-full px-2.5 py-0.5">
            {doctor.city}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-hairline">
        <span className="text-sm text-ink font-medium">₹{doctor.consultationFee}</span>
        <Link
          href={`/doctors/${doctor.id}`}
          className="inline-flex items-center rounded-full bg-deep-green text-on-primary text-xs px-4 py-1.5 font-semibold hover:bg-primary transition-colors"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
