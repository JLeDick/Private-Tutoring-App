"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { recomputeUserProgress } from "@/lib/progress";
import { scorePlacement } from "@/lib/placement";

export async function recordVisit(courseId: string, coreIdeaId: string | null) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") return;
  await prisma.user.update({
    where: { id: s.sub },
    data: {
      lastVisitedCourseId: courseId,
      lastVisitedCoreIdeaId: coreIdeaId,
    },
  });
}

export async function startOrResumeAttempt(assessmentId: string) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { type: true },
  });
  if (assessment?.type === "PLACEMENT") {
    const user = await prisma.user.findUnique({
      where: { id: s.sub },
      select: { placementCompletedAt: true },
    });
    if (user?.placementCompletedAt) {
      redirect("/student");
    }
  }

  const existing = await prisma.attempt.findFirst({
    where: { userId: s.sub, assessmentId, submittedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (existing) {
    redirect(`/student/attempt/${existing.id}`);
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId: s.sub,
      assessmentId,
    },
  });

  const questions = await prisma.question.findMany({
    where: { assessmentId },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.answer.createMany({
    data: questions.map((q) => ({
      attemptId: attempt.id,
      questionId: q.id,
    })),
  });

  redirect(`/student/attempt/${attempt.id}`);
}

export type SubmitAnswerInput = {
  questionId: string;
  selectedIndex?: number | null;
  textValue?: string | null;
};

export async function submitAttemptAction(attemptId: string, answers: SubmitAnswerInput[]) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: s.sub },
    include: {
      assessment: { include: { questions: true } },
    },
  });
  if (!attempt || attempt.submittedAt) {
    redirect(`/student/attempt/${attemptId}`);
  }

  const now = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000),
  );

  for (const row of answers) {
    await prisma.answer.updateMany({
      where: { attemptId, questionId: row.questionId },
      data: {
        selectedIndex: row.selectedIndex ?? null,
        textValue: row.textValue ?? null,
      },
    });
  }

  const questions = attempt.assessment.questions;
  let earned = 0;
  let max = 0;
  let fullyGraded = true;

  for (const q of questions) {
    max += q.points;
    const ans = await prisma.answer.findFirst({
      where: { attemptId, questionId: q.id },
    });
    if (!ans) {
      fullyGraded = false;
      continue;
    }
    if (q.type === "MULTIPLE_CHOICE") {
      const ok =
        ans.selectedIndex != null &&
        q.correctIndex != null &&
        ans.selectedIndex === q.correctIndex;
      const pts = ok ? q.points : 0;
      await prisma.answer.update({
        where: { id: ans.id },
        data: { pointsAwarded: pts },
      });
      earned += pts;
    } else {
      await prisma.answer.update({
        where: { id: ans.id },
        data: { pointsAwarded: null },
      });
      fullyGraded = false;
    }
  }

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      submittedAt: now,
      durationSeconds,
      earnedPoints: earned,
      maxPoints: max,
      fullyGraded,
    },
  });

  if (attempt.assessment.type === "PLACEMENT") {
    const placementQs = questions.filter((q) => q.type === "MULTIPLE_CHOICE" && q.correctIndex != null);
    const ansRows = await prisma.answer.findMany({ where: { attemptId } });
    const mapped = ansRows.map((a) => ({
      questionId: a.questionId,
      selectedIndex: a.selectedIndex,
    }));
    const { percent, courseSlug, coreSlug } = scorePlacement(placementQs, mapped);
    const course = await prisma.course.findUnique({ where: { slug: courseSlug } });
    const core = course
      ? await prisma.coreIdea.findUnique({
          where: { courseId_slug: { courseId: course.id, slug: coreSlug } },
        })
      : null;

    await prisma.user.update({
      where: { id: s.sub },
      data: {
        placementCompletedAt: now,
        startingGedPercent: percent,
        currentGedPercent: percent,
        recommendedCourseId: course?.id ?? null,
        recommendedCoreIdeaId: core?.id ?? null,
        lastVisitedCourseId: course?.id ?? null,
        lastVisitedCoreIdeaId: core?.id ?? null,
      },
    });
  } else if (fullyGraded) {
    await recomputeUserProgress(s.sub);
  }

  revalidatePath("/student");
  revalidatePath("/tutor");

  if (attempt.assessment.type === "PLACEMENT") {
    redirect("/student");
  }

  redirect(`/student/attempt/${attemptId}/done`);
}

export async function logIntegrityAction(input: {
  attemptId: string;
  questionId?: string | null;
  eventType: string;
  pastedLength?: number | null;
  clientTimestamp?: string | null;
}) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") return { ok: false as const };
  const own = await prisma.attempt.findFirst({
    where: { id: input.attemptId, userId: s.sub },
    select: { id: true },
  });
  if (!own) return { ok: false as const };

  await prisma.integrityEvent.create({
    data: {
      attemptId: input.attemptId,
      questionId: input.questionId ?? undefined,
      eventType: input.eventType,
      pastedLength: input.pastedLength ?? undefined,
      clientTimestamp: input.clientTimestamp ? new Date(input.clientTimestamp) : undefined,
    },
  });
  return { ok: true as const };
}

export async function startOrResumeAttemptForm(formData: FormData) {
  const id = String(formData.get("assessmentId") ?? "");
  if (!id) redirect("/student");
  await startOrResumeAttempt(id);
}
