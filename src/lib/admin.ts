import { Course, Enrollment, Payment, User } from "@/models";
export async function adminStats() {
  const [users, courses, published, enrollments, revenue] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments({ archived: false }),
    Course.countDocuments({ published: true, archived: false }),
    Enrollment.countDocuments(),
    Payment.aggregate<{ total: number }>([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  return {
    users,
    courses,
    published,
    enrollments,
    revenue: (revenue[0]?.total ?? 0) / 100,
  };
}
export async function adminUsers(page = 1) {
  return User.aggregate([
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * 25 },
    { $limit: 25 },
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "userId",
        as: "enrollments",
        pipeline: [{ $project: { _id: 1 } }],
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        active: 1,
        createdAt: 1,
        enrollmentCount: { $size: "$enrollments" },
      },
    },
  ]);
}
