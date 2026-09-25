import { Course, Enrollment, Lesson, Category } from "@/models";
import { Types } from "mongoose";
import { ApiError } from "./http";
import type { CourseInput } from "./validations";
export async function validateCourse(data: CourseInput, courseId?: string) {
  if (!(await Category.exists({ _id: data.category })))
    throw new ApiError(400, "Choose an existing category");
  if (
    data.thumbnail &&
    !data.thumbnail.startsWith(
      `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`,
    )
  )
    throw new ApiError(
      400,
      "Upload a thumbnail to this application’s Cloudinary account",
    );
  if (
    data.published &&
    (!data.thumbnail || !courseId || !(await Lesson.exists({ courseId })))
  )
    throw new ApiError(
      400,
      "Add a thumbnail and at least one video lesson before publishing",
    );
}
export async function getCourse(id: string) {
  const course = await Course.findOne({ _id: id, archived: false });
  if (!course) throw new ApiError(404, "Course not found");
  return course;
}
// A pipeline keeps completion and percentage consistent even with simultaneous updates.
export async function syncProgress(
  courseId: string,
  userId?: string,
  change?: { lessonId: string; completed: boolean },
) {
  const lessons = await Lesson.find({ courseId }).select("_id").lean();
  const ids = lessons.map((l) => l._id);
  const base = change
    ? {
        [change.completed ? "$setUnion" : "$setDifference"]: [
          "$completedLessons",
          [new Types.ObjectId(change.lessonId)],
        ],
      }
    : "$completedLessons";
  const filter = {
    courseId: new Types.ObjectId(courseId),
    ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
  };
  await Enrollment.updateMany(
    filter,
    [
      { $set: { completedLessons: { $setIntersection: [base, ids] } } },
      {
        $set: {
          progress: ids.length
            ? {
                $round: [
                  {
                    $multiply: [
                      { $divide: [{ $size: "$completedLessons" }, ids.length] },
                      100,
                    ],
                  },
                  0,
                ],
              }
            : 0,
        },
      },
    ],
    { updatePipeline: true },
  );
}
