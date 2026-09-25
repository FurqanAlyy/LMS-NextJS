import { Payment } from "@/models";
import { pageUser } from "@/lib/auth";
import { money } from "@/lib/utils";
import { AdminHeader } from "@/components/admin/header";
import { Pagination } from "@/components/ui";
type Populated = {
  userId: { name: string; email: string } | null;
  courseId: { title: string } | null;
};
export default async function Payments({
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
    Payment.find()
      .populate<Populated>("userId", "name email")
      .populate<Populated>("courseId", "title")
      .sort({ createdAt: -1 })
      .skip((page - 1) * 25)
      .limit(25)
      .lean(),
    Payment.countDocuments(),
  ]);
  return (
    <>
      <AdminHeader
        title="Payments"
        description="Checkout records and verified payments. Amounts are in USD; revenue is gross before fees or refunds."
      />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student / Course</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Stripe session</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={String(p._id)}>
                <td>
                  <p className="font-semibold">
                    {p.userId?.name ?? "Deleted user"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {p.courseId?.title ?? "Unavailable course"}
                  </p>
                </td>
                <td>{money(p.amount / 100, false)}</td>
                <td>
                  <span
                    className={`badge ${p.status === "paid" ? "" : "bg-amber-50 text-amber-700"}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td>
                  <span
                    className="block max-w-48 truncate font-mono text-xs"
                    title={p.stripeSessionId ?? undefined}
                  >
                    {p.stripeSessionId ?? "Checkout initializing"}
                  </span>
                </td>
                <td>{new Date(p.createdAt).toLocaleDateString("en-US")}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="text-muted">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pages={Math.ceil(total / 25)}
        href={(p) => `/admin/payments?page=${p}`}
      />
    </>
  );
}
