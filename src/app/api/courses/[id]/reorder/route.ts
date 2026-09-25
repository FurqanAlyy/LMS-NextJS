import { Lesson } from "@/models";
import { requireUser } from "@/lib/auth";
import { api, body, json, routeId, ApiError, type IdContext } from "@/lib/http";
import { reorderSchema } from "@/lib/validations";
import { getCourse } from "@/lib/courses";
export const PUT = api(async (request: Request, ctx: IdContext) => {
  await requireUser(true);
  const id = await routeId(ctx);
  await getCourse(id);
  const { lessonIds } = await body(request, reorderSchema);
  const existing = await Lesson.find({ courseId: id }).select("_id");
  const set = new Set(lessonIds);
  if (
    set.size !== lessonIds.length ||
    existing.length !== set.size ||
    existing.some((l) => !set.has(String(l._id)))
  )
    throw new ApiError(400, "Include each lesson in this course exactly once");
  await Lesson.bulkWrite(
    lessonIds.map((_id, order) => ({
      updateOne: { filter: { _id, courseId: id }, update: { $set: { order } } },
    })),
  );
  return json({ message: "Lesson order saved" });
});
