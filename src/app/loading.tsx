export default function Loading() {
  return (
    <div className="container-page py-16" role="status" aria-label="Loading">
      <div className="mb-8 h-10 w-2/5 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
