"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { recomputeUserProgress } from "@/lib/progress";

export async function gradeShortAnswerAction(input: {
  answerId: string;
  pointsAwarded: number;
  tutorComment?: string | null;
}) {
  const s = await readSession();
  if (!s || s.role !== "TUTOR") redirect("/login");

  const answer = await prisma.answer.findUnique({
    where: { id: input.answerId },
    include: {
      question: true,
      attempt: { include: { assessment: true, user: true } },
    },
  });
  if (!answer) redirect("/tutor");

  const max = answer.question.points;
  const pts = Math.max(0, Math.min(max, Math.floor(input.pointsAwarded)));

  await prisma.answer.update({
    where: { id: input.answerId },
    data: {
      pointsAwarded: pts,
      tutorComment: input.tutorComment ?? null,
    },
  });

  const attemptId = answer.attemptId;
  const allAnswers = await prisma.answer.findMany({
    where: { attemptId },
    include: { question: true },
  });
  let fully = true;
  let earned = 0;
  let maxPoints = 0;
  for (const a of allAnswers) {
    maxPoints += a.question.points;
    if (a.question.type === "SHORT_ANSWER") {
      if (a.pointsAwarded == null) fully = false;
      else earned += a.pointsAwarded;
    } else {
      earned += a.pointsAwarded ?? 0;
    }
  }

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      earnedPoints: earned,
      maxPoints,
      fullyGraded: fully,
    },
  });

  if (fully && answer.attempt.userId) {
    await recomputeUserProgress(answer.attempt.userId);
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  redirect(`/tutor/students/${answer.attempt.userId}`);
}

export async function regradeMultipleChoiceAction(input: {
  answerId: string;
  pointsAwarded: number;
}) {
  const s = await readSession();
  if (!s || s.role !== "TUTOR") redirect("/login");

  const answer = await prisma.answer.findUnique({
    where: { id: input.answerId },
    include: {
      question: true,
      attempt: true,
    },
  });
  if (!answer || answer.question.type !== "MULTIPLE_CHOICE") redirect("/tutor");

  const max = answer.question.points;
  const pts = Math.max(0, Math.min(max, Math.floor(input.pointsAwarded)));

  await prisma.answer.update({
    where: { id: input.answerId },
    data: { pointsAwarded: pts },
  });

  const attemptId = answer.attemptId;
  const allAnswers = await prisma.answer.findMany({
    where: { attemptId },
    include: { question: true },
  });
  let fully = true;
  let earned = 0;
  let maxPoints = 0;
  for (const a of allAnswers) {
    maxPoints += a.question.points;
    if (a.pointsAwarded == null) fully = false;
    earned += a.pointsAwarded ?? 0;
  }

  await prisma.attempt.update({
    where: { id: attemptId },
    data: { earnedPoints: earned, maxPoints, fullyGraded: fully },
  });

  if (fully) {
    await recomputeUserProgress(answer.attempt.userId);
  }

  revalidatePath("/tutor");
  redirect(`/tutor/students/${answer.attempt.userId}`);
}

export async function gradeShortAnswerForm(formData: FormData) {
  await gradeShortAnswerAction({
    answerId: String(formData.get("answerId") ?? ""),
    pointsAwarded: Number(formData.get("pointsAwarded") ?? "0"),
    tutorComment: String(formData.get("tutorComment") ?? ""),
  });
}

export async function regradeMcForm(formData: FormData) {
  await regradeMultipleChoiceAction({
    answerId: String(formData.get("answerId") ?? ""),
    pointsAwarded: Number(formData.get("pointsAwarded") ?? "0"),
  });
}
