import { prisma } from "@/lib/prisma";

/**
 * Recompute `currentGedPercent` from placement floor + share of weighted work completed (fully graded).
 */
export async function recomputeUserProgress(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { startingGedPercent: true },
  });
  if (!user) return;

  const assessments = await prisma.assessment.findMany({
    where: { type: { not: "PLACEMENT" } },
    select: { id: true, progressWeight: true },
  });

  const totalWeight = assessments.reduce((s, a) => s + a.progressWeight, 0);
  if (totalWeight <= 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { currentGedPercent: user.startingGedPercent },
    });
    return;
  }

  let earned = 0;
  for (const a of assessments) {
    const best = await prisma.attempt.findFirst({
      where: {
        userId,
        assessmentId: a.id,
        submittedAt: { not: null },
        fullyGraded: true,
        maxPoints: { not: null, gt: 0 },
      },
      orderBy: [{ earnedPoints: "desc" }],
      select: { earnedPoints: true, maxPoints: true },
    });
    if (!best?.earnedPoints || !best.maxPoints) continue;
    const ratio = Math.min(1, best.earnedPoints / best.maxPoints);
    earned += ratio * a.progressWeight;
  }

  const start = Math.min(100, Math.max(0, user.startingGedPercent));
  const delta = ((100 - start) * earned) / totalWeight;
  const current = Math.min(100, Math.round(start + delta));

  await prisma.user.update({
    where: { id: userId },
    data: { currentGedPercent: current },
  });
}

export async function getStudentProgress(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      startingGedPercent: true,
      currentGedPercent: true,
      placementCompletedAt: true,
    },
  });
}

export type AssessmentStatus = "not_started" | "in_progress" | "submitted_pending" | "graded";

export async function getAssessmentStatusForUser(
  userId: string,
  assessmentId: string,
): Promise<AssessmentStatus> {
  const attempts = await prisma.attempt.findMany({
    where: { userId, assessmentId },
    orderBy: { startedAt: "desc" },
    select: {
      submittedAt: true,
      fullyGraded: true,
    },
  });
  const inProg = attempts.find((a) => !a.submittedAt);
  if (inProg) return "in_progress";
  const latest = attempts[0];
  if (!latest) return "not_started";
  if (!latest.fullyGraded) return "submitted_pending";
  return "graded";
}

export async function getCoreIdeaStatuses(userId: string, coreIdeaId: string) {
  const assessments = await prisma.assessment.findMany({
    where: { coreIdeaId },
    select: { id: true, type: true, title: true },
  });
  const out: { id: string; type: string; title: string; status: AssessmentStatus }[] = [];
  for (const a of assessments) {
    out.push({
      ...a,
      status: await getAssessmentStatusForUser(userId, a.id),
    });
  }
  return out;
}

export async function getCourseUnitTestStatus(userId: string, courseId: string) {
  const ut = await prisma.assessment.findFirst({
    where: { courseId, type: "UNIT_TEST" },
    select: { id: true, title: true },
  });
  if (!ut) return null;
  return {
    id: ut.id,
    title: ut.title,
    status: await getAssessmentStatusForUser(userId, ut.id),
  };
}
