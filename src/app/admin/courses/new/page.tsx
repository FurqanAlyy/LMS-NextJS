import { Category } from "@/models";
import { pageUser } from "@/lib/auth";
import { serialize } from "@/lib/utils";
import type { CategoryData } from "@/types";
import { AdminHeader } from "@/components/admin/header";
import { CourseEditor } from "@/components/admin/course-editor";
export default async function NewCourse() {
  await pageUser(true);
  const categories = serialize<CategoryData[]>(
    await Category.find().sort({ name: 1 }).lean(),
  );
  return (
    <>
      <AdminHeader
        title="Create a course"
        description="Start with an idea. Save a draft, then bring it to life with lessons."
      />
      <CourseEditor categories={categories} />
    </>
  );
}
