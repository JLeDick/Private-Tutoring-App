import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { ProgressBar } from "@/components/ProgressBar";

export default async function StudentHomePage() {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    include: {
      recommendedCourse: true,
      recommendedCoreIdea: true,
      lastVisitedCourse: true,
      lastVisitedCoreIdea: true,
    },
  });
  if (!user) redirect("/login");

  const inProgress = await prisma.attempt.findFirst({
    where: { userId: s.sub, submittedAt: null },
    orderBy: { startedAt: "desc" },
    include: { assessment: true },
  });

  const pendingShortAnswers = await prisma.answer.count({
    where: {
      attempt: { userId: s.sub, submittedAt: { not: null } },
      question: { type: "SHORT_ANSWER" },
      pointsAwarded: null,
    },
  });

  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, title: true },
  });

  const continueHref = inProgress
    ? `/student/attempt/${inProgress.id}`
    : user.lastVisitedCourse
      ? user.lastVisitedCoreIdea
        ? `/student/courses/${user.lastVisitedCourse.slug}/core/${user.lastVisitedCoreIdea.id}`
        : `/student/courses/${user.lastVisitedCourse.slug}`
      : user.recommendedCourse && user.recommendedCoreIdea
        ? `/student/courses/${user.recommendedCourse.slug}/core/${user.recommendedCoreIdea.id}`
        : user.recommendedCourse
          ? `/student/courses/${user.recommendedCourse.slug}`
          : `/student/courses/${courses[0]?.slug ?? "foundational-math"}`;

  const continueLabel = inProgress
    ? `Continue: ${inProgress.assessment.title}`
    : user.lastVisitedCourse
      ? user.lastVisitedCoreIdea
        ? `Continue: ${user.lastVisitedCoreIdea.title}`
        : `Continue: ${user.lastVisitedCourse.title}`
      : user.recommendedCourse && user.recommendedCoreIdea
        ? `Start here: ${user.recommendedCoreIdea.title}`
        : "Continue: pick a class below";

  return (
    <div className="space-y-8">
      <div className="neon-card p-5">
        <div className="text-sm text-[var(--muted)]">Continue</div>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-base font-semibold">{continueLabel}</div>
          <Link className="neon-button text-center" href={continueHref}>
            Go
          </Link>
        </div>
        {inProgress ? (
          <p className="mt-3 text-xs text-[var(--muted)]">You have an assessment in progress. Open it to keep the same timer.</p>
        ) : null}
        {pendingShortAnswers > 0 ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Waiting on tutor grade: {pendingShortAnswers} short answer{pendingShortAnswers === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>

      <ProgressBar
        label="GED readiness"
        startingPercent={user.startingGedPercent}
        currentPercent={user.currentGedPercent}
      />

      {user.recommendedCourse && user.recommendedCoreIdea ? (
        <div className="neon-card p-5">
          <div className="text-sm text-[var(--muted)]">Suggested starting topic</div>
          <div className="mt-2 font-semibold">{user.recommendedCoreIdea.title}</div>
          <div className="mt-3 text-sm text-[var(--muted)]">
            You still have access to everything. This is just the best next step based on placement.
          </div>
          <div className="mt-4">
            <Link
              className="neon-button--secondary neon-button inline-block"
              href={`/student/courses/${user.recommendedCourse.slug}/core/${user.recommendedCoreIdea.id}`}
            >
              Open topic
            </Link>
          </div>
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Classes</h2>
        <div className="mt-4 grid gap-3">
          {courses.map((c) => (
            <Link key={c.id} className="neon-card block p-4 hover:border-cyan-400/45" href={`/student/courses/${c.slug}`}>
              <div className="font-semibold">{c.title}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">Open topics and assessments</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
