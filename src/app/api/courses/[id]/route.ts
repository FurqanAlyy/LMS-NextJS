import { Course, Enrollment, Lesson } from "@/models";
import { currentUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  api,
  body,
  json,
  routeId,
  sameOrigin,
  ApiError,
  type IdContext,
} from "@/lib/http";
import { courseSchema } from "@/lib/validations";
import { getCourse, validateCourse } from "@/lib/courses";
export const GET = api(async (_request: Request, ctx: IdContext) => {
  await db();
  const id = await routeId(ctx);
  const user = await currentUser();
  const course = await Course.findById(id).populate("category").lean();
  const enrollment = user
    ? await Enrollment.findOne({ userId: user._id, courseId: id }).lean()
    : null;
  if (
    !course ||
    ((!course.published || course.archived) &&
      user?.role !== "admin" &&
      !enrollment)
  )
    throw new ApiError(404, "Course not found");
  const lessons = await Lesson.find({ courseId: id })
    .select(user?.role === "admin" ? "+videoPublicId" : "")
    .sort({ order: 1, _id: 1 })
    .lean();
  return json({ course, lessons, enrollment });
});
export const PATCH = api(async (request: Request, ctx: IdContext) => {
  await requireUser(true);
  const id = await routeId(ctx);
  await getCourse(id);
  const data = await body(request, courseSchema);
  await validateCourse(data, id);
  return json(
    await Course.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    }),
  );
});
export const DELETE = api(async (request: Request, ctx: IdContext) => {
  sameOrigin(request);
  await requireUser(true);
  const id = await routeId(ctx);
  await getCourse(id);
  // Preserve paid access and accounting history; remove the course from discovery and management.
  await Course.updateOne({ _id: id }, { archived: true, published: false });
  return json({
    message: "Course deleted from the catalog. Existing students keep access.",
  });
});
