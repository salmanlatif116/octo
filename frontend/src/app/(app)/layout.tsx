"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuthStore } from "@/store/authStore";
import { useMounted } from "@/lib/useMounted";

// Everything inside (app) is for a logged-in user. Visitors go to /login, admins to /admin.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mounted = useMounted();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!mounted) return;
    if (!user) router.replace("/login/");
    else if (user.role === "admin") router.replace("/admin/");
  }, [mounted, user, router]);

  // The session lives in localStorage, so it can only be read in the browser.
  if (!mounted || user?.role !== "user") return null;

  return (
    <div className="min-h-screen overflow-y-auto bg-[#88afed19]">
      <div className="pt-6">
        <Header />
      </div>
      <div className="py-8 pb-32 px-6 sm:px-8 lg:px-12 flex justify-center">
        <div className="w-full max-w-xl">{children}</div>
      </div>
      <div className="pb-6">
        <Footer />
      </div>
    </div>
  );
}
