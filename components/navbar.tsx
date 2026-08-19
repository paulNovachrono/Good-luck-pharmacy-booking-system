import Link from "next/link";
import { getSession } from "@/lib/auth";
import Logo from "@/components/logo";
import Button from "@/components/button";

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full relative z-50">
      <Link href="/">
        <Logo />
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm text-body-muted">
        <Link href="/doctors" className="hover:text-ink transition-colors">
          Doctors
        </Link>
        <Link href="/account" className="hover:text-ink transition-colors">
          My Appointments
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {session ? (
          <Button href="/account" variant="outline" className="text-xs px-4 py-2 md:text-sm md:px-5 md:py-2.5">
            My Account
          </Button>
        ) : (
          <Button href="/login" variant="outline" className="text-xs px-4 py-2 md:text-sm md:px-5 md:py-2.5">
            Log in
          </Button>
        )}
        <Button href="/doctors" variant="primary" className="text-xs px-4 py-2 md:text-sm md:px-6 md:py-2.5">
          Book Appointment
        </Button>
      </div>
    </nav>
  );
}
