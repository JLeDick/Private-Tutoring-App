import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { readSession } from "@/lib/auth/session";

export default async function StudentRootLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-black/20 backdrop-blur px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/student" className="font-semibold tracking-tight text-[var(--accent)]">
          GED Math
        </Link>
        <form action={logoutAction} method="post">
          <button type="submit" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
