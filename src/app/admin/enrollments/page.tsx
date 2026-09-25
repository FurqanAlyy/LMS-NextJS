import { Enrollment } from "@/models";
import { pageUser } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/header";
import { Pagination, ProgressBar } from "@/components/ui";
type Populated = {
  userId: { name: string; email: string } | null;
  courseId: { title: string } | null;
};
export default async function Enrollments({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await pageUser(true);
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number((await searchParams).page)) || 1),
  );
  const [rows, total] = await Promise.all([
    Enrollment.find()
      .populate<Populated>("userId", "name email")
      .populate<Populated>("courseId", "title")
      .sort({ enrolledAt: -1 })
      .skip((page - 1) * 25)
      .limit(25)
      .lean(),
    Enrollment.countDocuments(),
  ]);
  return (
    <>
      <AdminHeader
        title="Enrollments"
        description="See who’s learning and how far they’ve come."
      />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Progress</th>
              <th>Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={String(e._id)}>
                <td>
                  <p className="font-semibold">
                    {e.userId?.name ?? "Deleted user"}
                  </p>
                  <p className="mt-1 text-xs text-muted">{e.userId?.email}</p>
                </td>
                <td>{e.courseId?.title ?? "Unavailable course"}</td>
                <td>
                  <div className="min-w-28">
                    <p className="mb-2 text-xs">
                      {e.progress}% · {e.completedLessons.length} lessons
                    </p>
                    <ProgressBar value={e.progress} />
                  </div>
                </td>
                <td>{new Date(e.enrolledAt).toLocaleDateString("en-US")}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="text-muted">
                  No enrollments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pages={Math.ceil(total / 25)}
        href={(p) => `/admin/enrollments?page=${p}`}
      />
    </>
  );
}
