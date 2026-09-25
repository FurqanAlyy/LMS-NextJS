import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Course } from "@/models";
import { pageUser } from "@/lib/auth";
import { money } from "@/lib/utils";
import { AdminHeader } from "@/components/admin/header";
import { ConfirmButton } from "@/components/confirm-button";
import { EmptyState, Pagination } from "@/components/ui";
export default async function AdminCourses({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  await pageUser(true);
  const params = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.page)) || 1),
  );
  const filter = {
    archived: false,
    ...(params.search
      ? {
          title: {
            $regex: params.search
              .slice(0, 100)
              .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        }
      : {}),
  };
  const [courses, total] = await Promise.all([
    Course.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * 15)
      .limit(15)
      .lean(),
    Course.countDocuments(filter),
  ]);
  return (
    <>
      <AdminHeader
        title="Courses"
        description="Create, refine, and share something worth learning."
      >
        <Link href="/admin/courses/new" className="btn">
          <Plus size={17} />
          New course
        </Link>
      </AdminHeader>
      <form className="mb-6 flex max-w-lg gap-3">
        <input
          name="search"
          aria-label="Search courses"
          placeholder="Search your courses…"
          defaultValue={params.search}
        />
        <button className="btn-secondary">Search</button>
      </form>
      {courses.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Status</th>
                <th>Price</th>
                <th>Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={String(c._id)}>
                  <td>
                    <Link
                      href={`/admin/courses/${c._id}/edit`}
                      className="font-semibold hover:text-brand"
                    >
                      {c.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{c.instructor}</p>
                  </td>
                  <td>
                    <span
                      className={`badge ${!c.published ? "bg-amber-50 text-amber-700" : ""}`}
                    >
                      {c.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>{money(c.price)}</td>
                  <td>{c.level}</td>
                  <td>
                    <div className="flex items-center">
                      <Link
                        className="btn-ghost"
                        href={`/admin/courses/${c._id}/edit`}
                      >
                        <Pencil size={15} />
                        Edit
                      </Link>
                      <ConfirmButton
                        url={`/api/courses/${c._id}`}
                        label="Delete"
                        message="Remove this course from the catalog? Existing students will keep access to their lessons."
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No courses yet"
          description="Create your first course, add a few lessons, and share what you know."
          href="/admin/courses/new"
          action="Create course"
        />
      )}
      <Pagination
        page={page}
        pages={Math.ceil(total / 15)}
        href={(p) =>
          `/admin/courses?${new URLSearchParams({ ...params, page: String(p) })}`
        }
      />
    </>
  );
}
