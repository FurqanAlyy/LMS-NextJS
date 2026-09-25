import { Course, Lesson } from "@/models";
import { requireUser } from "@/lib/auth";
import {
  api,
  body,
  json,
  routeId,
  sameOrigin,
  ApiError,
  type IdContext,
} from "@/lib/http";
import { lessonSchema } from "@/lib/validations";
import { syncProgress } from "@/lib/courses";
import { verifyVideo } from "@/lib/cloudinary";
export const PATCH = api(async (request: Request, ctx: IdContext) => {
  await requireUser(true);
  const id = await routeId(ctx);
  const lesson = await Lesson.findById(id).select("+videoPublicId");
  if (!lesson) throw new ApiError(404, "Lesson not found");
  const data = await body(request, lessonSchema);
  const video =
    data.videoPublicId === lesson.videoPublicId
      ? {}
      : await verifyVideo(data.videoPublicId);
  return json(
    await Lesson.findByIdAndUpdate(
      id,
      { ...data, ...video },
      { returnDocument: "after", runValidators: true },
    ).select("+videoPublicId"),
  );
});
export const DELETE = api(async (request: Request, ctx: IdContext) => {
  sameOrigin(request);
  await requireUser(true);
  const lesson = await Lesson.findByIdAndDelete(await routeId(ctx));
  if (!lesson) throw new ApiError(404, "Lesson not found");
  const courseId = String(lesson.courseId);
  if (!(await Lesson.exists({ courseId })))
    await Course.updateOne({ _id: courseId }, { published: false });
  await syncProgress(courseId);
  return json({ message: "Lesson deleted" });
});
