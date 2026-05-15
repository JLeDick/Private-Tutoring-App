import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";

export default async function TutorHomePage() {
  const s = await readSession();
  if (!s || s.role !== "TUTOR") redirect("/login");

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "asc" },
    select: { id: true, displayName: true, currentGedPercent: true, startingGedPercent: true },
  });

  const pendingShortAnswers = await prisma.answer.findMany({
    where: {
      pointsAwarded: null,
      question: { type: "SHORT_ANSWER" },
      attempt: { submittedAt: { not: null } },
    },
    orderBy: { id: "desc" },
    take: 25,
    include: {
      question: true,
      attempt: { include: { user: true, assessment: true } },
    },
  });

  const recentAttempts = await prisma.attempt.findMany({
    where: { submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: 20,
    include: { user: true, assessment: true },
  });

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Tutor overview</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">What needs grading, recent timing, and quick links into a student.</p>
      </header>

      <section className="neon-card p-5">
        <h2 className="font-semibold">Students</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)]">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">GED %</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((u) => (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="py-2 pr-4">{u.displayName ?? "Student"}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {u.currentGedPercent}% <span className="text-[var(--muted)]">(start {u.startingGedPercent}%)</span>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Link className="text-[var(--accent)] hover:underline" href={`/tutor/students/${u.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="neon-card p-5">
        <h2 className="font-semibold">Pending short answers</h2>
        {pendingShortAnswers.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Nothing waiting.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Assessment</th>
                  <th className="py-2 pr-4">Prompt</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {pendingShortAnswers.map((a) => (
                  <tr key={a.id} className="border-t border-white/10 align-top">
                    <td className="py-2 pr-4">{a.attempt.user.displayName ?? "Student"}</td>
                    <td className="py-2 pr-4 text-[var(--muted)]">{a.attempt.assessment.title}</td>
                    <td className="py-2 pr-4">{a.question.prompt}</td>
                    <td className="py-2 pr-4 text-right">
                      <Link className="text-[var(--accent)] hover:underline" href={`/tutor/students/${a.attempt.userId}`}>
                        Grade
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="neon-card p-5">
        <h2 className="font-semibold">Recent submitted attempts</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)]">
              <tr>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Assessment</th>
                <th className="py-2 pr-4">Seconds</th>
                <th className="py-2 pr-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.map((a) => (
                <tr key={a.id} className="border-t border-white/10">
                  <td className="py-2 pr-4 text-[var(--muted)]">{a.submittedAt?.toISOString().slice(0, 19)}</td>
                  <td className="py-2 pr-4">{a.user.displayName ?? "Student"}</td>
                  <td className="py-2 pr-4">{a.assessment.title}</td>
                  <td className="py-2 pr-4 tabular-nums">{a.durationSeconds ?? ""}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {a.earnedPoints ?? ""}/{a.maxPoints ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
