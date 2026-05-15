import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { startOrResumeAttemptForm } from "@/app/actions/student";

export default async function PlacementPage() {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    select: { placementCompletedAt: true },
  });
  if (user?.placementCompletedAt) {
    redirect("/student");
  }

  const placement = await prisma.assessment.findFirst({
    where: { type: "PLACEMENT" },
    select: {
      id: true,
      title: true,
      _count: { select: { questions: true } },
    },
  });
  if (!placement) {
    return (
      <div className="neon-card p-6">
        <div className="font-semibold">Placement test is not available yet.</div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Run <code className="text-[var(--accent)]">npm run db:seed</code> from the project folder (needs Postgres running).
        </p>
      </div>
    );
  }

  const n = placement._count.questions;

  return (
    <div className="space-y-6">
      <div className="neon-card p-6">
        <h1 className="text-2xl font-semibold">{placement.title}</h1>
        <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
          This is not pass or fail. It helps set your starting readiness percent so the dashboard reflects what you
          already know, and highlights a good place to begin. After this, all four math classes and practice questions
          live under <strong className="text-[var(--text)]">Classes</strong> on your home screen (the seed includes real
          multiple-choice and short-answer items you can grow over time).
        </p>
        <ul className="mt-4 list-disc pl-5 text-sm text-[var(--muted)] space-y-1">
          <li>
            This placement has <strong className="text-[var(--text)]">{n}</strong> multiple-choice checks.
          </li>
          <li>There is a timer, but it only counts up (no time limit).</li>
        </ul>
      </div>

      <form
        method="post"
        action={startOrResumeAttemptForm}
        className="neon-card p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <input type="hidden" name="assessmentId" value={placement.id} />
        <div className="text-sm text-[var(--muted)]">When you are ready, start the placement.</div>
        <button className="neon-button" type="submit">
          Start placement
        </button>
      </form>
    </div>
  );
}
