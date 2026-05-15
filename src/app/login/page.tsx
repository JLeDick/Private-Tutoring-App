import { prisma } from "@/lib/prisma";
import { loginAsStudent, loginAsTutor } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  const [student, tutor] = await Promise.all([
    prisma.user.findFirst({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "asc" },
      select: { displayName: true },
    }),
    prisma.user.findFirst({
      where: { role: "TUTOR" },
      orderBy: { createdAt: "asc" },
      select: { displayName: true },
    }),
  ]);

  const studentLabel = student?.displayName ?? "Student";
  const tutorLabel = tutor?.displayName ?? "Tutor";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="neon-card p-8 w-full max-w-md">
        <h1 className="text-xl font-semibold">Who is using the app?</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Tap your name. No passwords — this is only for you two on your network.</p>

        {sp.error === "setup" ? (
          <div className="mt-4 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm">
            User records are missing. From the project folder run: <code className="text-[var(--accent)]">npm run db:seed</code>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          <form method="post" action={loginAsStudent}>
            <button className="neon-button w-full py-4 text-lg" type="submit">
              {studentLabel}
            </button>
          </form>
          <form method="post" action={loginAsTutor}>
            <button className="neon-button neon-button--secondary w-full py-4 text-lg" type="submit">
              {tutorLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
