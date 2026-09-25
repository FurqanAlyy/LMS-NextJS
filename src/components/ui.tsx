import Link from "next/link";
import { BookOpen, ArrowLeft, ArrowRight } from "lucide-react";
export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-5 rounded-2xl bg-mint p-4 text-brand">
        <BookOpen size={26} />
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        {description}
      </p>
      {href && (
        <Link href={href} className="btn mt-6">
          {action ?? "Explore courses"} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Course progress"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className="h-full rounded-full bg-brand transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
export function Pagination({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
}) {
  if (pages <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-5"
    >
      {page > 1 && (
        <Link className="btn-secondary" href={href(page - 1)}>
          <ArrowLeft size={16} /> Previous
        </Link>
      )}
      <span className="text-sm text-muted">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link className="btn-secondary" href={href(page + 1)}>
          Next <ArrowRight size={16} />
        </Link>
      )}
    </nav>
  );
}
