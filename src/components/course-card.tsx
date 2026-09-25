import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Signal } from "lucide-react";
import type { CourseData } from "@/types";
import { money } from "@/lib/utils";
export function CourseCard({ course }: { course: CourseData }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-mint">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand/30">
            <BookOpen size={72} strokeWidth={1} />
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold">
          {course.category?.name ?? "Course"}
        </span>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-muted">
          <Signal size={14} /> {course.level}
        </div>
        <h3 className="line-clamp-2 min-h-14 text-xl font-semibold leading-7">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {course.shortDescription}
        </p>
        <p className="mt-5 text-xs text-muted">
          With <span className="font-medium text-ink">{course.instructor}</span>
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-lg font-semibold">{money(course.price)}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-brand">
            View course <ArrowUpRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}
