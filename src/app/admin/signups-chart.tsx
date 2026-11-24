/** Sign-ups per day for the last 30 days. Single series: the heading names it, so there's no legend. */
export function SignupsChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <figure>
      <div className="relative h-48" aria-hidden="true">
        {/* Recessive gridlines at 0, half and max */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2.5 -left-1 -translate-x-full pr-1 text-[11px] text-subtle tabular-nums">
              {Math.round(max * f)}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-ink transition-colors group-hover:bg-periwinkle"
                style={{ height: d.count ? `${(d.count / max) * 100}%` : "0", minHeight: d.count ? 3 : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg group-hover:block">
                <span className="text-mist">{fmt(d.day)}</span> · <strong>{d.count}</strong> sign-up{d.count === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-subtle" aria-hidden="true">
        <span>{data[0] && fmt(data[0].day)}</span>
        <span>Today</span>
      </div>
      <figcaption className="sr-only">
        {total} sign-ups in the last 30 days.
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Sign-ups</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>{fmt(d.day)}</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
