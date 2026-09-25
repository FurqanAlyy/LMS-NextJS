import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  LockKeyhole,
  Play,
  Signal,
  UserRound,
} from "lucide-react";
import { Course, Enrollment, Lesson } from "@/models";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { money, duration, serialize } from "@/lib/utils";
import type { CourseData } from "@/types";
import { EnrollButton } from "@/components/enroll-button";
export const dynamic = "force-dynamic";
export default async function CourseDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  await db();
  const { slug } = await params;
  const user = await currentUser();
  const doc = await Course.findOne({ slug }).populate("category").lean();
  if (!doc) notFound();
  const enrolled = user
    ? !!(await Enrollment.exists({ userId: user._id, courseId: doc._id }))
    : false;
  if ((!doc.published || doc.archived) && user?.role !== "admin" && !enrolled)
    notFound();
  const course = serialize<CourseData>(doc);
  const lessons = await Lesson.find({ courseId: doc._id })
    .sort({ order: 1, _id: 1 })
    .lean();
  return (
    <div className="container-page py-10">
      <Link href="/courses" className="btn-ghost -ml-3 mb-6">
        <ArrowLeft size={16} /> All courses
      </Link>
      {(await searchParams).checkout === "cancelled" && (
        <p
          role="status"
          className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
        >
          Checkout was cancelled. You haven’t been charged. You can try again
          whenever you’re ready.
        </p>
      )}
      <div className="grid items-start gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <span className="badge">{course.category?.name ?? "Course"}</span>
          {!course.published && (
            <span className="badge ml-2 bg-amber-50 text-amber-700">
              Unpublished
            </span>
          )}
          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
            {course.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            {course.shortDescription}
          </p>
          <div className="my-7 flex flex-wrap gap-5 text-sm text-muted">
            <span className="flex items-center gap-2">
              <UserRound size={17} /> {course.instructor}
            </span>
            <span className="flex items-center gap-2">
              <Signal size={17} /> {course.level}
            </span>
            <span className="flex items-center gap-2">
              <Clock3 size={17} />{" "}
              {duration(lessons.reduce((a, l) => a + l.duration, 0))}
            </span>
          </div>
          <div className="border-y border-slate-200 py-8">
            <h2 className="mb-4 text-2xl font-semibold">About this course</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted">
              {course.description}
            </p>
          </div>
          <div className="mt-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your learning path</h2>
              <span className="text-sm text-muted">
                {lessons.length} lessons
              </span>
            </div>
            <div className="card divide-y divide-slate-100">
              {lessons.map((l, i) => {
                const access =
                  enrolled || l.isPreview || user?.role === "admin";
                const content = (
                  <>
                    <span className="text-sm text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{l.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {duration(l.duration)}
                        {l.isPreview && (
                          <span className="ml-2 font-medium text-brand">
                            Free preview
                          </span>
                        )}
                      </p>
                    </div>
                    {access ? (
                      <Play size={17} className="text-brand" />
                    ) : (
                      <LockKeyhole size={16} className="text-muted" />
                    )}
                  </>
                );
                return access ? (
                  <Link
                    key={String(l._id)}
                    href={`/learn/${course._id}/${l._id}`}
                    className="flex items-center gap-4 p-5 hover:bg-mint/30"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={String(l._id)}
                    className="flex items-center gap-4 p-5"
                  >
                    {content}
                  </div>
                );
              })}
              {!lessons.length && (
                <p className="p-5 text-sm text-muted">
                  Lessons are being prepared.
                </p>
              )}
            </div>
          </div>
        </div>
        <aside className="card overflow-hidden lg:sticky lg:top-28">
          <div className="relative aspect-video bg-mint">
            {course.thumbnail ? (
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
              />
            ) : (
              <BookOpen
                className="absolute inset-0 m-auto text-brand"
                size={50}
              />
            )}
          </div>
          <div className="p-7">
            <p className="mb-1 text-3xl font-semibold">{money(course.price)}</p>
            <p className="mb-6 text-xs text-muted">
              {course.price
                ? "One payment. Learn at your own pace."
                : "A great place to start. No payment needed."}
            </p>
            {course.published || enrolled ? (
              <EnrollButton
                courseId={course._id}
                price={course.price}
                owned={enrolled}
                slug={slug}
              />
            ) : (
              <p className="text-sm text-muted">
                Publish this course to enable enrollment.
              </p>
            )}
            <ul className="mt-6 space-y-3 text-sm text-muted">
              {[
                `${lessons.length} video lessons`,
                "Learn on any device",
                "Track your progress",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={16} className="text-brand" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
