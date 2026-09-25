import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";
export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 py-9">
      <div className="container-page flex flex-col justify-between gap-5 text-sm sm:flex-row">
        <div>
          <Link href="/" className="mb-2 flex items-center gap-2 font-semibold">
            <BookOpen size={18} /> LearnX.
          </Link>
          <p className="text-muted">A little progress. Every weekend.</p>
        </div>
        <div className="flex items-center gap-6 text-muted">
          <Link href="/courses" className="flex items-center gap-1">
            Explore courses <ArrowUpRight size={15} />
          </Link>
          <span>© {new Date().getFullYear()} LearnX</span>
        </div>
      </div>
    </footer>
  );
}
