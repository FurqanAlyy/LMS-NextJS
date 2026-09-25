import { Course, Enrollment, Lesson } from "@/models";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { api, json, routeId, ApiError, type IdContext } from "@/lib/http";
import { playbackUrl } from "@/lib/cloudinary";
export const GET = api(async (_request: Request, ctx: IdContext) => {
  await db();
  const lesson = await Lesson.findById(await routeId(ctx)).select(
    "+videoPublicId +videoFormat",
  );
  if (!lesson) throw new ApiError(404, "Lesson not found");
  const course = await Course.findById(lesson.courseId);
  const user = await currentUser();
  const enrolled =
    user &&
    (await Enrollment.exists({ userId: user._id, courseId: lesson.courseId }));
  const preview = lesson.isPreview && course?.published && !course.archived;
  if (!course || (!preview && !enrolled && user?.role !== "admin"))
    throw new ApiError(
      user ? 403 : 401,
      "Enroll in this course to watch this lesson",
    );
  return json({
    url: playbackUrl(lesson.videoPublicId, lesson.videoFormat),
    expiresIn: 3600,
  });
});
