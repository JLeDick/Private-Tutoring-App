"use client";

import { useState, useTransition } from "react";
import { submitAttemptAction, type SubmitAnswerInput } from "@/app/actions/student";
import { ElapsedTimer } from "@/components/ElapsedTimer";
import { IntegritySurface } from "@/components/IntegritySurface";

type Q = {
  id: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  prompt: string;
  choicesJson: string | null;
};

export function AttemptForm(props: { attemptId: string; startedAtIso: string; questions: Q[] }) {
  const [pending, startTransition] = useTransition();
  const [mc, setMc] = useState<Record<string, number | null>>({});
  const [sa, setSa] = useState<Record<string, string>>({});

  return (
    <form
      className="space-y-8"
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        const answers: SubmitAnswerInput[] = props.questions.map((q) => {
          if (q.type === "MULTIPLE_CHOICE") {
            return { questionId: q.id, selectedIndex: mc[q.id] ?? null };
          }
          return { questionId: q.id, textValue: sa[q.id] ?? "" };
        });
        startTransition(async () => {
          await submitAttemptAction(props.attemptId, answers);
        });
      }}
    >
      <ElapsedTimer startedAtIso={props.startedAtIso} />

      <IntegritySurface attemptId={props.attemptId}>
        <div className="space-y-8">
          {props.questions.map((q, idx) => {
            const choices = (() => {
              try {
                return q.choicesJson ? (JSON.parse(q.choicesJson) as string[]) : [];
              } catch {
                return [] as string[];
              }
            })();
            return (
              <section key={q.id} className="neon-card p-5" data-question-id={q.id}>
                <div className="text-sm text-[var(--muted)]">Question {idx + 1}</div>
                <div className="mt-2 text-base font-medium">{q.prompt}</div>

                {q.type === "MULTIPLE_CHOICE" ? (
                  <div className="mt-4 space-y-2">
                    {choices.map((c, i) => (
                      <label key={i} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 hover:border-cyan-400/35">
                        <input
                          type="radio"
                          className="mt-1"
                          name={`mc-${q.id}`}
                          checked={mc[q.id] === i}
                          onChange={() => setMc((m) => ({ ...m, [q.id]: i }))}
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="mt-4 min-h-[120px]"
                    data-question-id={q.id}
                    value={sa[q.id] ?? ""}
                    onChange={(e) => setSa((s) => ({ ...s, [q.id]: e.target.value }))}
                  />
                )}
              </section>
            );
          })}
        </div>
      </IntegritySurface>

      <button type="submit" disabled={pending} className="neon-button w-full sm:w-auto">
        {pending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
