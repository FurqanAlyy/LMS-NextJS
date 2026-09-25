import { Course } from "@/models";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { api, body, json } from "@/lib/http";
import { courseSchema, idSchema } from "@/lib/validations";
import { validateCourse } from "@/lib/courses";
export const GET = api(async (request: Request) => {
  await db();
  const params = new URL(request.url).searchParams;
  const admin = params.get("admin") === "true";
  if (admin) await requireUser(true);
  const query: Record<string, unknown> = {
    archived: false,
    ...(!admin ? { published: true } : {}),
  };
  const search = params.get("search")?.slice(0, 100);
  const category = params.get("category");
  const level = params.get("level");
  if (search)
    query.title = {
      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  if (category) query.category = idSchema.parse(category);
  if (level && ["Beginner", "Intermediate", "Advanced"].includes(level))
    query.level = level;
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.get("page"))) || 1),
  );
  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip((page - 1) * 12)
      .limit(12)
      .lean(),
    Course.countDocuments(query),
  ]);
  return json({ courses, total, page, pages: Math.ceil(total / 12) });
});
export const POST = api(async (request: Request) => {
  await requireUser(true);
  const data = await body(request, courseSchema);
  await validateCourse(data);
  return json(await Course.create(data), 201);
});
