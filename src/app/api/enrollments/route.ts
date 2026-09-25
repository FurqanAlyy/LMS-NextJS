import { Course, Enrollment } from "@/models";
import { requireUser } from "@/lib/auth";
import { api, body, json, ApiError } from "@/lib/http";
import { enrollmentSchema } from "@/lib/validations";
export const GET = api(async () => {
  const user = await requireUser();
  return json(
    await Enrollment.find({ userId: user._id })
      .populate({ path: "courseId", populate: { path: "category" } })
      .sort({ enrolledAt: -1 })
      .lean(),
  );
});
export const POST = api(async (request: Request) => {
  const user = await requireUser();
  const { courseId } = await body(request, enrollmentSchema);
  const course = await Course.findOne({
    _id: courseId,
    published: true,
    archived: false,
  });
  if (!course) throw new ApiError(404, "Course not found");
  if (course.price !== 0)
    throw new ApiError(403, "This course requires payment");
  const enrollment = await Enrollment.findOneAndUpdate(
    { userId: user._id, courseId },
    {
      $setOnInsert: {
        enrolledAt: new Date(),
        progress: 0,
        completedLessons: [],
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  return json(enrollment, 201);
});
