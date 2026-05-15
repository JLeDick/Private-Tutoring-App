"use client";

import { useEffect, useRef } from "react";
import { logIntegrityAction } from "@/app/actions/student";

export function IntegritySurface(props: { attemptId: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = async (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      const qid = t?.getAttribute?.("data-question-id") ?? undefined;
      const type = e.type;
      let pastedLength: number | undefined;
      if (type === "paste" && e.clipboardData?.getData) {
        pastedLength = e.clipboardData.getData("text")?.length ?? 0;
      }
      await logIntegrityAction({
        attemptId: props.attemptId,
        questionId: qid,
        eventType: type,
        pastedLength,
        clientTimestamp: new Date().toISOString(),
      });
    };

    el.addEventListener("copy", handler, true);
    el.addEventListener("cut", handler, true);
    el.addEventListener("paste", handler, true);
    return () => {
      el.removeEventListener("copy", handler, true);
      el.removeEventListener("cut", handler, true);
      el.removeEventListener("paste", handler, true);
    };
  }, [props.attemptId]);

  return (
    <div ref={ref} className="space-y-6">
      {props.children}
    </div>
  );
}
