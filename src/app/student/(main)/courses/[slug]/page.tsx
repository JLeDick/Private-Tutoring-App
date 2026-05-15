import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { getCourseUnitTestStatus } from "@/lib/progress";
import { recordVisit } from "@/app/actions/student";
import { startOrResumeAttemptForm } from "@/app/actions/student";

function statusLabel(status: string) {
  if (status === "not_started") return "Not started";
  if (status === "in_progress") return "In progress";
  if (status === "submitted_pending") return "Submitted (waiting on tutor)";
  return "Graded";
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: { coreIdeas: { orderBy: { sortOrder: "asc" } } },
  });
  if (!course) notFound();

  await recordVisit(course.id, null);

  const unit = await getCourseUnitTestStatus(s.sub, course.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Pick a topic. Each topic has an assignment and a quiz.</p>
      </header>

      <section className="neon-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">Unit test</div>
            <div className="mt-1 text-sm text-[var(--muted)]">{unit?.title ?? "Not configured"}</div>
            {unit ? <div className="mt-2 text-xs text-[var(--muted)]">{statusLabel(unit.status)}</div> : null}
          </div>
          {unit ? (
            <form action={startOrResumeAttemptForm} method="post">
              <input type="hidden" name="assessmentId" value={unit.id} />
              <button className="neon-button" type="submit">
                {unit.status === "in_progress" ? "Resume" : "Start"}
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Topics</h2>
        <div className="mt-4 space-y-3">
          {course.coreIdeas.map((idea) => (
            <Link
              key={idea.id}
              className="neon-card block p-4 hover:border-fuchsia-400/35"
              href={`/student/courses/${course.slug}/core/${idea.id}`}
            >
              <div className="font-semibold">{idea.title}</div>
              {idea.description ? <div className="mt-1 text-sm text-[var(--muted)]">{idea.description}</div> : null}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
