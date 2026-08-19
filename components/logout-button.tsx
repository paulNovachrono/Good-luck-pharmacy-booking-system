"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ variant = "light" }: { variant?: "light" | "admin" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (variant === "admin") {
    return (
      <button
        onClick={logout}
        disabled={loading}
        className="w-full text-sm text-white/70 hover:text-white font-medium disabled:opacity-40 cursor-pointer"
      >
        {loading ? "Logging out…" : "Log out"}
      </button>
    );
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="text-sm text-body-muted hover:text-ink font-medium disabled:opacity-40 cursor-pointer"
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
