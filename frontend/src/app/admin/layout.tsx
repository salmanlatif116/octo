"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LogOut, Receipt, Users } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import octoLogo from "@/assets/octo-logo.png";
import { signOut } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useMounted } from "@/lib/useMounted";

const tabs = [
  { to: "/admin/", label: "Users", icon: Users },
  { to: "/admin/receipts/", label: "Receipts", icon: Receipt },
  { to: "/admin/activity/", label: "Activity", icon: Activity },
];

// Admin area: only for the admin login; everyone else goes back to /login.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();
  const user = useAuthStore((state) => state.user);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    if (!user) router.replace("/login/");
    else if (user.role !== "admin") router.replace("/");
  }, [mounted, user, router]);

  if (!mounted || user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-[#88afed19]">
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={octoLogo.src} alt="octo logo" className="w-16" />
            <span className="rounded-full bg-[#083174] px-2.5 py-0.5 text-xs font-bold text-white">Admin</span>
          </div>

          <nav className="flex items-center gap-1">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = to === "/admin/" ? pathname.replace(/\/$/, "") === "/admin" : pathname.startsWith(to.slice(0, -1));
              return (
                <Link
                  key={to}
                  href={to}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-[#083174]/10 text-[#083174]" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Icon size={16} /> {label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setConfirming(true)}
            aria-label="Log out"
            className="rounded-full bg-red-50 p-2 text-red-500 hover:bg-red-100"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <ConfirmDialog
        open={confirming}
        title="Log out?"
        message="You will need your admin User ID and password to sign in again."
        confirmLabel="Log out"
        danger
        onConfirm={() => signOut()}
        onCancel={() => setConfirming(false)}
      />

      <main className="mx-auto max-w-6xl px-5 py-6 pb-16">{children}</main>
    </div>
  );
}
