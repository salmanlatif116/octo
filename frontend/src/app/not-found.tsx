"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Unknown URL: send the visitor to the home page (which redirects to /login/ if logged out).
export default function NotFound() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
