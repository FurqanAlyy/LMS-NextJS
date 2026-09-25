import { Lesson } from "@/models";
import { requireUser } from "@/lib/auth";
import { api, body, json, routeId, type IdContext } from "@/lib/http";
import { lessonSchema } from "@/lib/validations";
import { getCourse, syncProgress } from "@/lib/courses";
import { verifyVideo } from "@/lib/cloudinary";
export const POST = api(async (request: Request, ctx: IdContext) => {
  await requireUser(true);
  const id = await routeId(ctx);
  await getCourse(id);
  const data = await body(request, lessonSchema);
  const video = await verifyVideo(data.videoPublicId);
  const last = await Lesson.findOne({ courseId: id }).sort({ order: -1 });
  const lesson = await Lesson.create({
    ...data,
    ...video,
    courseId: id,
    order: (last?.order ?? -1) + 1,
  });
  await syncProgress(id);
  return json(lesson, 201);
});
