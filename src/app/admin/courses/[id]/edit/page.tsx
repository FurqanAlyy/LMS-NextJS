import { notFound } from "next/navigation";
import { Category, Course, Lesson } from "@/models";
import { pageUser } from "@/lib/auth";
import { idSchema } from "@/lib/validations";
import { serialize } from "@/lib/utils";
import type { CategoryData, CourseData, LessonData } from "@/types";
import { AdminHeader } from "@/components/admin/header";
import { CourseEditor } from "@/components/admin/course-editor";
import { LessonManager } from "@/components/admin/lesson-manager";
export default async function EditCourse({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await pageUser(true);
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [course, categories, lessons] = await Promise.all([
    Course.findOne({ _id: id, archived: false }).populate("category").lean(),
    Category.find().sort({ name: 1 }).lean(),
    Lesson.find({ courseId: id })
      .select("+videoPublicId")
      .sort({ order: 1, _id: 1 })
      .lean(),
  ]);
  if (!course) notFound();
  return (
    <>
      <AdminHeader
        title="Edit course"
        description="Shape your content, arrange your lessons, and publish when you’re ready."
      />
      <CourseEditor
        course={serialize<CourseData>(course)}
        categories={serialize<CategoryData[]>(categories)}
      />
      <LessonManager courseId={id} lessons={serialize<LessonData[]>(lessons)} />
    </>
  );
}
