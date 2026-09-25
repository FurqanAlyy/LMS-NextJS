import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  LibraryBig,
  GraduationCap,
  CreditCard,
  Radio,
} from "lucide-react";
import { pageUser } from "@/lib/auth";
import { adminStats } from "@/lib/admin";
import { money } from "@/lib/utils";
import { Course } from "@/models";
import { AdminHeader } from "@/components/admin/header";
export default async function Admin() {
  await pageUser(true);
  const stats = await adminStats();
  const courses = await Course.find({ archived: false })
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();
  const cards = [
    { label: "Total users", value: stats.users, icon: Users },
    { label: "Courses", value: stats.courses, icon: LibraryBig },
    { label: "Published", value: stats.published, icon: Radio },
    { label: "Enrollments", value: stats.enrollments, icon: GraduationCap },
    {
      label: "Gross revenue",
      value: money(stats.revenue, false),
      icon: CreditCard,
    },
  ];
  return (
    <>
      <AdminHeader
        title="A big-picture view."
        description="Keep your courses and your learning community moving forward."
      >
        <Link href="/admin/courses/new" className="btn">
          Create course <ArrowUpRight size={16} />
        </Link>
      </AdminHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <c.icon size={20} className="mb-5 text-brand" />
            <p className="text-2xl font-semibold">{c.value}</p>
            <p className="mt-2 text-xs text-muted">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="mb-5 mt-10 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recently updated courses</h2>
        <Link className="btn-ghost" href="/admin/courses">
          View all <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="card divide-y divide-slate-100">
        {courses.map((c) => (
          <Link
            href={`/admin/courses/${c._id}/edit`}
            className="flex items-center justify-between gap-4 p-5 hover:bg-mint/20"
            key={String(c._id)}
          >
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="mt-1 text-xs text-muted">
                {c.instructor} · {c.level}
              </p>
            </div>
            <span
              className={`badge ${!c.published ? "bg-amber-50 text-amber-700" : ""}`}
            >
              {c.published ? "Published" : "Draft"}
            </span>
          </Link>
        ))}
        {!courses.length && (
          <div className="p-10 text-center text-sm text-muted">
            Your first course starts here. Create a draft to get going.
          </div>
        )}
      </div>
      <div className="card mt-8 bg-mint/40 p-6">
        <h2 className="font-semibold">A simple publishing checklist</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Write a clear course description, upload a thumbnail, and add at least
          one video lesson. Preview your course, then publish when you’re ready.
        </p>
      </div>
    </>
  );
}
