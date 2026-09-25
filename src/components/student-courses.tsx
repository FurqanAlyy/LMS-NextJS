import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { Enrollment, Lesson } from "@/models";
import { progress, serialize } from "@/lib/utils";
import type { EnrollmentData } from "@/types";
import { EmptyState, ProgressBar } from "./ui";
export async function studentEnrollments(userId: string) {
  const enrolled = serialize<EnrollmentData[]>(
    await Enrollment.find({ userId })
      .populate({ path: "courseId", populate: { path: "category" } })
      .sort({ updatedAt: -1 })
      .lean(),
  );
  const lessons = await Lesson.find({
    courseId: {
      $in: enrolled.filter((e) => e.courseId).map((e) => e.courseId._id),
    },
  })
    .select("_id courseId")
    .lean();
  return enrolled
    .filter((e) => e.courseId)
    .map((e) => ({
      ...e,
      ...progress(
        e.completedLessons,
        lessons
          .filter((l) => String(l.courseId) === e.courseId._id)
          .map((l) => String(l._id)),
      ),
    }));
}
export function StudentCourses({
  enrollments,
}: {
  enrollments: EnrollmentData[];
}) {
  if (!enrollments.length)
    return (
      <EmptyState
        title="Your next chapter is waiting"
        description="Find a course you’re curious about. Once you enroll, your lessons and progress will appear here."
        href="/courses"
      />
    );
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {enrollments.map((e) => (
        <div key={e._id} className="card overflow-hidden">
          <div className="relative aspect-[2/1] bg-mint">
            {e.courseId.thumbnail ? (
              <Image
                src={e.courseId.thumbnail}
                alt={e.courseId.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover"
              />
            ) : (
              <BookOpen
                className="absolute inset-0 m-auto text-brand"
                size={40}
              />
            )}
          </div>
          <div className="p-5">
            <span className="badge">
              {e.courseId.category?.name ?? "Course"}
            </span>
            <h3 className="mb-2 mt-3 text-xl font-semibold">
              {e.courseId.title}
            </h3>
            <p className="text-xs text-muted">{e.courseId.instructor}</p>
            <div className="mb-2 mt-5 flex justify-between text-xs text-muted">
              <span>{e.completedLessons.length} lessons complete</span>
              <span>{e.progress}%</span>
            </div>
            <ProgressBar value={e.progress} />
            <Link
              href={`/learn/${e.courseId._id}`}
              className="btn-secondary mt-5 w-full"
            >
              {e.progress === 100 ? "Review course" : "Continue Learning"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
