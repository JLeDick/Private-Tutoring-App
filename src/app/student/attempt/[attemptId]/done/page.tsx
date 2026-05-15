import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { StudentBackLink } from "@/components/StudentBackLink";

export default async function AttemptDonePage({ params }: { params: Promise<{ attemptId: string }> }) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: s.sub, submittedAt: { not: null } },
    include: {
      assessment: true,
      answers: { include: { question: true } },
    },
  });
  if (!attempt) notFound();

  const duration = attempt.durationSeconds ?? 0;
  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(duration % 60).padStart(2, "0");

  return (
    <div className="space-y-6">
      <StudentBackLink />
      <div className="neon-card p-6">
        <h1 className="text-2xl font-semibold">Submitted</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{attempt.assessment.title}</p>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--muted)]">Time</span>
            <span className="tabular-nums">
              {mm}:{ss}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--muted)]">Score so far</span>
            <span className="tabular-nums">
              {attempt.earnedPoints ?? 0}/{attempt.maxPoints ?? 0}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--muted)]">Fully graded</span>
            <span>{attempt.fullyGraded ? "Yes" : "Not yet (short answers pending)"}</span>
          </div>
        </div>

        <div className="mt-6">
          <Link className="neon-button inline-block" href="/student">
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="neon-card p-5">
        <div className="font-semibold">Question breakdown</div>
        <div className="mt-3 space-y-2 text-sm">
          {attempt.answers
            .slice()
            .sort((a, b) => a.question.sortOrder - b.question.sortOrder)
            .map((a) => (
              <div key={a.id} className="flex justify-between gap-4 border-b border-white/5 py-2">
                <div className="text-[var(--muted)] line-clamp-2">{a.question.prompt}</div>
                <div className="tabular-nums text-right">
                  {a.question.type === "SHORT_ANSWER" && a.pointsAwarded == null ? (
                    <span className="text-[var(--muted)]">Pending</span>
                  ) : (
                    <span>
                      {a.pointsAwarded ?? 0}/{a.question.points}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
