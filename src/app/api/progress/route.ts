import { Enrollment, Lesson } from "@/models";
import { requireUser } from "@/lib/auth";
import { api, body, json, ApiError } from "@/lib/http";
import { progressSchema } from "@/lib/validations";
import { syncProgress } from "@/lib/courses";
export const PATCH = api(async (request: Request) => {
  const user = await requireUser();
  const data = await body(request, progressSchema);
  const lesson = await Lesson.findById(data.lessonId);
  if (!lesson) throw new ApiError(404, "Lesson not found");
  const filter = { userId: user._id, courseId: lesson.courseId };
  if (!(await Enrollment.exists(filter)))
    throw new ApiError(403, "Enrollment required");
  await syncProgress(String(lesson.courseId), String(user._id), data);
  return json(await Enrollment.findOne(filter).lean());
});
