import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth/session";
import { AttemptForm } from "@/components/AttemptForm";
import { StudentBackLink } from "@/components/StudentBackLink";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const s = await readSession();
  if (!s || s.role !== "STUDENT") redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: s.sub },
    include: {
      assessment: {
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!attempt) notFound();
  if (attempt.submittedAt) {
    redirect(`/student/attempt/${attemptId}/done`);
  }

  return (
    <div className="space-y-6">
      <StudentBackLink />
      <header>
        <div className="text-sm text-[var(--muted)]">{attempt.assessment.title}</div>
        <h1 className="mt-1 text-2xl font-semibold">Assessment</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">The timer counts up. Submit when you are finished.</p>
      </header>

      <AttemptForm
        attemptId={attempt.id}
        startedAtIso={attempt.startedAt.toISOString()}
        questions={attempt.assessment.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          choicesJson: q.choicesJson,
        }))}
      />

      <div className="text-xs text-[var(--muted)]">
        Copy, cut, and paste events are logged for tutoring review (not the clipboard contents).
      </div>
    </div>
  );
}
