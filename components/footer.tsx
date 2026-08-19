import Link from "next/link";
import Logo from "@/components/logo";

export default function Footer() {
  return (
    <footer className="bg-deep-green text-on-primary">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="flex flex-col gap-4">
          <Logo dark />
          <p className="text-xs text-white/60 leading-relaxed max-w-xs">
            Verified doctors. Book same-day appointments and get WhatsApp
            reminders.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4">
            Book
          </p>
          <ul className="space-y-2">
            <li>
              <Link
                href="/doctors"
                className="text-xs text-white/60 hover:text-on-primary transition-colors"
              >
                Find a doctor
              </Link>
            </li>
            <li>
              <Link
                href="/account"
                className="text-xs text-white/60 hover:text-on-primary transition-colors"
              >
                My appointments
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4">
            Support
          </p>
          <ul className="space-y-3 text-xs">
            <li className="text-white/80">Phone: +91XXXXXXXXXX</li>
            <li className="text-white/80">Email: hello@glp.in</li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4">
            Hours
          </p>
          <ul className="space-y-2 text-xs text-white/60">
            <li>Mon – Fri: 10:00 – 14:00</li>
            <li>Saturday: 10:00 – 13:00</li>
            <li>Sunday: Closed</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} Green Leaf Polyclinic. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-on-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-on-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
