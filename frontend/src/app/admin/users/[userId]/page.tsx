import { Suspense } from "react";
import AdminUserDetail from "@/components/admin/AdminUserDetail";

// The site is exported to static files, so a page cannot be built per user. One placeholder page
// ("_") is built, and the backend serves it for /admin/users/<any user id>/. The component reads
// the real id from the address bar.
export function generateStaticParams() {
  return [{ userId: "_" }];
}

export default function AdminUserPage() {
  return (
    <Suspense fallback={null}>
      <AdminUserDetail />
    </Suspense>
  );
}
