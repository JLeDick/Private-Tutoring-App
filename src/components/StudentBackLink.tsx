"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StudentBackLink() {
  const pathname = usePathname();
  if (pathname === "/student" || pathname?.startsWith("/student/placement")) return null;
  return (
    <div className="mb-6">
      <Link className="text-sm text-[var(--accent)] hover:underline" href="/student">
        ← Back to dashboard
      </Link>
    </div>
  );
}
