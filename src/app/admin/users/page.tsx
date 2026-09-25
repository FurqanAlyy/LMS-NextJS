import { User } from "@/models";
import { pageUser } from "@/lib/auth";
import { adminUsers } from "@/lib/admin";
import { AdminHeader } from "@/components/admin/header";
import { ConfirmButton } from "@/components/confirm-button";
import { Pagination } from "@/components/ui";
export default async function Users({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await pageUser(true);
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number((await searchParams).page)) || 1),
  );
  const [users, total] = await Promise.all([
    adminUsers(page),
    User.countDocuments(),
  ]);
  return (
    <>
      <AdminHeader
        title="Your learning community"
        description="Manage student access. Administrator accounts are protected from changes here."
      />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Courses</th>
              <th>Joined</th>
              <th>Status / Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u._id)}>
                <td>
                  <p className="font-semibold">{u.name}</p>
                  <p className="mt-1 text-xs text-muted">{u.email}</p>
                </td>
                <td>
                  <span className="badge">{u.role}</span>
                </td>
                <td>{u.enrollmentCount}</td>
                <td>{new Date(u.createdAt).toLocaleDateString("en-US")}</td>
                <td>
                  <span
                    className={`text-xs ${u.active ? "text-brand" : "text-red-700"}`}
                  >
                    {u.active ? "Active" : "Suspended"}
                  </span>
                  {u.role === "student" && (
                    <ConfirmButton
                      url={`/api/admin/users/${u._id}`}
                      method="PATCH"
                      payload={{ active: !u.active }}
                      label={u.active ? "Suspend" : "Activate"}
                      message={
                        u.active
                          ? "Suspend this student’s access? Their enrollments and payment records will be preserved."
                          : "Restore this student’s account access?"
                      }
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pages={Math.ceil(total / 25)}
        href={(p) => `/admin/users?page=${p}`}
      />
    </>
  );
}
