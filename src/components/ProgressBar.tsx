export function ProgressBar(props: {
  label: string;
  startingPercent: number;
  currentPercent: number;
}) {
  const start = Math.min(100, Math.max(0, props.startingPercent));
  const cur = Math.min(100, Math.max(0, props.currentPercent));

  return (
    <section className="neon-card p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-[var(--muted)]">{props.label}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{cur}%</div>
        </div>
        <div className="text-xs text-[var(--muted)] max-w-[18rem] text-right">
          The dim band is “already behind you” from placement. Bright fill is progress toward GED Ready.
        </div>
      </div>

      <div className="mt-4 h-5 w-full rounded-full bg-black/40 border border-[var(--border)] overflow-hidden relative">
        <div
          className="absolute left-0 top-0 h-full bg-slate-700/60"
          style={{ width: `${start}%` }}
          aria-hidden
        />
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-400/70 via-fuchsia-400/60 to-cyan-300/70"
          style={{
            width: `${cur}%`,
            boxShadow: "0 0 22px rgba(34,211,238,0.35)",
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-[var(--muted)] tabular-nums">
        <span>0%</span>
        <span>
          start {start}% → now {cur}% → goal 100%
        </span>
        <span>100%</span>
      </div>
    </section>
  );
}
