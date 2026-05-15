import type { Question } from "@prisma/client";

/**
 * Map raw placement score (0–1) to starting GED readiness percent and pick a course/core idea to highlight.
 */
export function scorePlacement(
  questions: Pick<Question, "id" | "correctIndex" | "points">[],
  answers: { questionId: string; selectedIndex: number | null }[],
): { percent: number; courseSlug: string; coreSlug: string } {
  let correct = 0;
  let total = 0;
  const byId = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));
  for (const q of questions) {
    if (q.correctIndex == null) continue;
    total += 1;
    const sel = byId.get(q.id);
    if (sel != null && sel === q.correctIndex) correct += 1;
  }
  const ratio = total === 0 ? 0 : correct / total;

  // Bands: tune later; higher ratio => higher starting percent.
  let percent = 5;
  let courseSlug = "foundational-math";
  let coreSlug = "number-sense";

  if (ratio >= 0.85) {
    percent = 45;
    courseSlug = "algebra-1";
    coreSlug = "linear-equations";
  } else if (ratio >= 0.65) {
    percent = 32;
    courseSlug = "geometry";
    coreSlug = "angles-and-lines";
  } else if (ratio >= 0.45) {
    percent = 22;
    courseSlug = "pre-algebra";
    coreSlug = "expressions";
  } else if (ratio >= 0.25) {
    percent = 14;
    courseSlug = "foundational-math";
    coreSlug = "fractions";
  }

  return { percent, courseSlug, coreSlug };
}
