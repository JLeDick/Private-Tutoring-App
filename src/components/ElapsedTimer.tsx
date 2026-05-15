"use client";

import { useEffect, useMemo, useState } from "react";

export function ElapsedTimer(props: { startedAtIso: string }) {
  const startMs = useMemo(() => new Date(props.startedAtIso).getTime(), [props.startedAtIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));
  const hh = Math.floor(elapsed / 3600);
  const mm = Math.floor((elapsed % 3600) / 60);
  const ss = elapsed % 60;
  const text =
    hh > 0
      ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-center">
      <div className="text-xs text-[var(--muted)]">Timer (count up)</div>
      <div className="mt-1 text-4xl font-semibold tabular-nums tracking-wide text-[var(--accent)]">{text}</div>
    </div>
  );
}
