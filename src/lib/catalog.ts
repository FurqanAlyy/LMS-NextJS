import "server-only";
import { Category, Course } from "@/models";
import { db } from "./db";
import { serialize } from "./utils";
import type { CategoryData, CourseData } from "@/types";
export async function catalog(
  params: {
    search?: string;
    category?: string;
    level?: string;
    page?: string;
  } = {},
) {
  if (!process.env.DATABASE_URL)
    return {
      courses: [] as CourseData[],
      categories: [] as CategoryData[],
      total: 0,
      page: 1,
      pages: 0,
    };
  await db();
  const query: Record<string, unknown> = { published: true, archived: false };
  if (params.search)
    query.title = {
      $regex: params.search
        .slice(0, 100)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  if (params.category) {
    const category = await Category.findOne({ slug: params.category });
    query.category = category?._id ?? null;
  }
  if (
    params.level &&
    ["Beginner", "Intermediate", "Advanced"].includes(params.level)
  )
    query.level = params.level;
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.page)) || 1),
  );
  const [courses, categories, total] = await Promise.all([
    Course.find(query)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip((page - 1) * 12)
      .limit(12)
      .lean(),
    Category.find().sort({ name: 1 }).lean(),
    Course.countDocuments(query),
  ]);
  return {
    courses: serialize<CourseData[]>(courses),
    categories: serialize<CategoryData[]>(categories),
    total,
    page,
    pages: Math.ceil(total / 12),
  };
}
