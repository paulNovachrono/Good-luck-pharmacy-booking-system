import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminNav from "./admin-nav";
import Logo from "@/components/logo";
import LogoutButton from "@/components/logout-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, phone: true, role: true },
  });

  const isSuper = session.role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen flex bg-canvas">
      <aside className="w-64 shrink-0 bg-deep-green text-white flex flex-col fixed inset-y-0 left-0 z-40">
        <div className="px-6 py-5 border-b border-white/10">
          <Logo dark />
        </div>
        <div className="flex-1 overflow-y-auto py-5">
          <AdminNav />
        </div>
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <div className="px-3">
            <p className="text-sm font-semibold text-white truncate">
              {user?.name ?? user?.phone ?? "Admin"}
            </p>
            <p className="text-xs text-white/50">{user?.role}</p>
          </div>
          <LogoutButton variant="admin" />
        </div>
      </aside>
      <main className="flex-1 ml-64 min-w-0">
        <header className="h-16 border-b border-hairline bg-white flex items-center justify-end px-8 gap-4">
          <Link
            href="/"
            className="text-sm text-body-muted hover:text-ink transition-colors"
          >
            View site →
          </Link>
          {isSuper ? (
            <span className="text-xs bg-pale-green text-deep-green rounded-full px-2.5 py-1 font-semibold">
              Super Admin
            </span>
          ) : null}
        </header>
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
