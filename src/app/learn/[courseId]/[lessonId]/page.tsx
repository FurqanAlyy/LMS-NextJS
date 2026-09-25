import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  LockKeyhole,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Course, Enrollment, Lesson } from "@/models";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { idSchema } from "@/lib/validations";
import { duration, progress } from "@/lib/utils";
import { VideoPlayer } from "@/components/video-player";
import { CompleteButton } from "@/components/complete-button";
import { ProgressBar } from "@/components/ui";
export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  if (
    !idSchema.safeParse(courseId).success ||
    !idSchema.safeParse(lessonId).success
  )
    notFound();
  await db();
  const user = await currentUser();
  const [course, lessons, enrollment] = await Promise.all([
    Course.findById(courseId),
    Lesson.find({ courseId }).sort({ order: 1, _id: 1 }).lean(),
    user ? Enrollment.findOne({ courseId, userId: user._id }) : null,
  ]);
  const index = lessons.findIndex((l) => String(l._id) === lessonId);
  const lesson = lessons[index];
  if (
    !course ||
    !lesson ||
    ((!course.published || course.archived) &&
      !enrollment &&
      user?.role !== "admin")
  )
    notFound();
  const allowed =
    (lesson.isPreview && course.published && !course.archived) ||
    enrollment ||
    user?.role === "admin";
  if (!allowed) redirect(`/courses/${course.slug}`);
  const state = progress(
    enrollment?.completedLessons.map(String) ?? [],
    lessons.map((l) => String(l._id)),
  );
  return (
    <div className="container-page py-8">
      <Link href={`/courses/${course.slug}`} className="btn-ghost -ml-3 mb-5">
        <ArrowLeft size={16} /> Back to course
      </Link>
      <div className="grid gap-7 lg:grid-cols-[300px_1fr]">
        <aside className="card order-2 self-start overflow-hidden lg:order-1">
          <div className="border-b border-slate-100 p-5">
            <p className="eyebrow mb-2">YOUR LEARNING PATH</p>
            <h2 className="text-lg font-semibold">{course.title}</h2>
            <div className="my-3 flex justify-between text-xs text-muted">
              <span>
                {state.completedLessons.length} of {lessons.length} complete
              </span>
              <span>{state.progress}%</span>
            </div>
            <ProgressBar value={state.progress} />
          </div>
          <nav
            aria-label="Course lessons"
            className="max-h-[65vh] overflow-y-auto"
          >
            {lessons.map((l, i) => {
              const done = state.completedLessons.includes(String(l._id));
              const unlocked =
                enrollment || l.isPreview || user?.role === "admin";
              return (
                <Link
                  aria-current={String(l._id) === lessonId ? "page" : undefined}
                  href={
                    unlocked
                      ? `/learn/${courseId}/${l._id}`
                      : `/courses/${course.slug}`
                  }
                  key={String(l._id)}
                  className={`flex items-start gap-3 border-b border-slate-100 p-4 text-sm ${String(l._id) === lessonId ? "bg-mint text-brand" : "hover:bg-slate-50"}`}
                >
                  {done ? (
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-brand"
                    />
                  ) : unlocked ? (
                    <Circle size={18} className="mt-0.5 shrink-0 text-muted" />
                  ) : (
                    <LockKeyhole
                      size={18}
                      className="mt-0.5 shrink-0 text-muted"
                    />
                  )}
                  <span>
                    <span className="font-medium">
                      {i + 1}. {l.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {duration(l.duration)} {l.isPreview && "· Preview"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="order-1 min-w-0 lg:order-2">
          <VideoPlayer
            key={lessonId}
            lessonId={lessonId}
            title={lesson.title}
          />
          <div className="my-7 flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="eyebrow mb-2">
                Lesson {index + 1} of {lessons.length}
              </p>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {lesson.title}
              </h1>
            </div>
            {enrollment && (
              <CompleteButton
                lessonId={lessonId}
                completed={state.completedLessons.includes(lessonId)}
              />
            )}
          </div>
          {!enrollment && (
            <div className="mb-6 rounded-xl bg-mint p-4 text-sm">
              You’re watching a preview.{" "}
              <Link
                className="font-semibold underline"
                href={`/courses/${course.slug}`}
              >
                Enroll to track your progress and unlock every lesson.
              </Link>
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted">
            {lesson.description}
          </p>
          <div className="mt-9 flex justify-between gap-3 border-t border-slate-200 pt-6">
            {index > 0 ? (
              <Link
                className="btn-secondary"
                href={`/learn/${courseId}/${lessons[index - 1]._id}`}
              >
                <ArrowLeft size={16} /> Previous lesson
              </Link>
            ) : (
              <span />
            )}
            {index < lessons.length - 1 ? (
              <Link
                className="btn"
                href={`/learn/${courseId}/${lessons[index + 1]._id}`}
              >
                Next lesson <ArrowRight size={16} />
              </Link>
            ) : (
              <Link className="btn-secondary" href="/dashboard">
                Back to my learning
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
