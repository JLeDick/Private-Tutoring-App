import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { getAssessmentStatusForUser } from "@/lib/progress";
import { recordVisit } from "@/app/actions/student";
import { startOrResumeAttemptForm } from "@/app/actions/student";

function statusLabel(status: string) {
  if (status === "not_started") return "Not started";
  if (status === "in_progress") return "In progress";
  if (status === "submitted_pending") return "Submitted (waiting on tutor)";
  return "Graded";
}

export default async function CoreIdeaPage({
  params,
}: {
  params: Promise<{ slug: string; coreIdeaId: string }>;
}) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");
  const { slug, coreIdeaId } = await params;

  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) notFound();

  const idea = await prisma.coreIdea.findFirst({
    where: { id: coreIdeaId, courseId: course.id },
  });
  if (!idea) notFound();

  await recordVisit(course.id, idea.id);

  const assessments = await prisma.assessment.findMany({
    where: { coreIdeaId: idea.id, type: { in: ["ASSIGNMENT", "QUIZ"] } },
    orderBy: [{ type: "asc" }],
  });

  const rows = [];
  for (const a of assessments) {
    rows.push({
      id: a.id,
      title: a.title,
      type: a.type,
      status: await getAssessmentStatusForUser(s.sub, a.id),
    });
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="text-sm text-[var(--muted)]">{course.title}</div>
        <h1 className="mt-1 text-2xl font-semibold">{idea.title}</h1>
        {idea.description ? <p className="mt-2 text-sm text-[var(--muted)]">{idea.description}</p> : null}
      </header>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="neon-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">{r.title}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{statusLabel(r.status)}</div>
            </div>
            <form action={startOrResumeAttemptForm} method="post">
              <input type="hidden" name="assessmentId" value={r.id} />
              <button className="neon-button" type="submit">
                {r.status === "in_progress" ? "Resume" : r.status === "not_started" ? "Start" : "Start again"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
