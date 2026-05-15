import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { gradeShortAnswerForm, regradeMcForm } from "@/app/actions/tutor";

export default async function TutorStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await readSession();
  if (!s || s.role !== "TUTOR") redirect("/login");
  const { id } = await params;

  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    select: { id: true, displayName: true, startingGedPercent: true, currentGedPercent: true },
  });
  if (!student) notFound();

  const attempts = await prisma.attempt.findMany({
    where: { userId: student.id, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: 30,
    include: {
      assessment: true,
      answers: { include: { question: true } },
      integrityEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link className="text-sm text-[var(--accent)] hover:underline" href="/tutor">
          ← Back to tutor home
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{student.displayName ?? "Student"}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          GED readiness: <span className="text-[var(--text)] tabular-nums">{student.currentGedPercent}%</span>{" "}
          <span className="text-[var(--muted)]">(placement start {student.startingGedPercent}%)</span>
        </p>
      </div>

      <section className="neon-card p-5">
        <h2 className="font-semibold">Submitted attempts</h2>
        <div className="mt-4 space-y-6">
          {attempts.map((a) => (
            <div key={a.id} className="border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold">{a.assessment.title}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Submitted {a.submittedAt?.toISOString().slice(0, 19)} · {a.durationSeconds ?? "?"}s · score{" "}
                    {a.earnedPoints ?? 0}/{a.maxPoints ?? 0} · fully graded: {a.fullyGraded ? "yes" : "no"}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <div className="font-semibold text-[var(--muted)]">Integrity events</div>
                {a.integrityEvents.length === 0 ? (
                  <div className="mt-1 text-[var(--muted)]">None logged.</div>
                ) : (
                  <ul className="mt-2 space-y-1 text-[var(--muted)]">
                    {a.integrityEvents.map((e) => (
                      <li key={e.id} className="flex flex-wrap gap-x-3 gap-y-1">
                        <span className="text-[var(--text)]">{e.eventType}</span>
                        <span>{e.createdAt.toISOString().slice(0, 19)}</span>
                        {e.pastedLength != null ? <span>pastedLen={e.pastedLength}</span> : null}
                        {e.questionId ? <span>question={e.questionId.slice(0, 6)}…</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 space-y-4">
                {a.answers
                  .slice()
                  .sort((x, y) => x.question.sortOrder - y.question.sortOrder)
                  .map((ans) => (
                    <div key={ans.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-[var(--muted)]">{ans.question.type}</div>
                      <div className="mt-1 font-medium">{ans.question.prompt}</div>
                      {ans.question.type === "MULTIPLE_CHOICE" ? (
                        <div className="mt-2 text-sm text-[var(--muted)]">
                          Selected index: <span className="text-[var(--text)] tabular-nums">{ans.selectedIndex ?? ""}</span>{" "}
                          · points <span className="tabular-nums">{ans.pointsAwarded ?? 0}</span>/
                          <span className="tabular-nums">{ans.question.points}</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm">
                          <div className="text-[var(--muted)]">Student answer</div>
                          <div className="mt-1 whitespace-pre-wrap">{ans.textValue ?? ""}</div>
                        </div>
                      )}

                      {ans.question.type === "SHORT_ANSWER" && a.submittedAt ? (
                        <form action={gradeShortAnswerForm} method="post" className="mt-4 grid gap-3 sm:grid-cols-3">
                          <input type="hidden" name="answerId" value={ans.id} />
                          <label className="sm:col-span-1">
                            <div className="text-xs text-[var(--muted)]">Points (max {ans.question.points})</div>
                            <input
                              className="mt-1"
                              name="pointsAwarded"
                              type="number"
                              min={0}
                              max={ans.question.points}
                              defaultValue={ans.pointsAwarded ?? 0}
                              required
                            />
                          </label>
                          <label className="sm:col-span-2">
                            <div className="text-xs text-[var(--muted)]">Comment (optional)</div>
                            <input className="mt-1" name="tutorComment" defaultValue={ans.tutorComment ?? ""} />
                          </label>
                          <button className="neon-button sm:col-span-3" type="submit">
                            Save short answer grade
                          </button>
                        </form>
                      ) : null}

                      {ans.question.type === "MULTIPLE_CHOICE" && a.submittedAt ? (
                        <form action={regradeMcForm} method="post" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                          <input type="hidden" name="answerId" value={ans.id} />
                          <label className="flex-1">
                            <div className="text-xs text-[var(--muted)]">Re-grade MC points (max {ans.question.points})</div>
                            <input
                              className="mt-1"
                              name="pointsAwarded"
                              type="number"
                              min={0}
                              max={ans.question.points}
                              defaultValue={ans.pointsAwarded ?? 0}
                              required
                            />
                          </label>
                          <button className="neon-button" type="submit">
                            Save MC points
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
