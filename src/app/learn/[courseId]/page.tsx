import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { Enrollment, Lesson } from "@/models";
import { idSchema } from "@/lib/validations";
export default async function Learn({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!idSchema.safeParse(courseId).success) notFound();
  const user = await pageUser();
  await db();
  const enrollment = await Enrollment.findOne({ userId: user._id, courseId });
  if (!enrollment && user.role !== "admin") redirect("/courses");
  const lessons = await Lesson.find({ courseId }).sort({ order: 1, _id: 1 });
  const next =
    lessons.find(
      (l) =>
        !enrollment?.completedLessons.some(
          (id) => String(id) === String(l._id),
        ),
    ) ?? lessons[0];
  if (!next) notFound();
  redirect(`/learn/${courseId}/${next._id}`);
}
