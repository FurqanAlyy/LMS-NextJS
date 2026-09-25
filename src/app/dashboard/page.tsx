import Link from "next/link";
import { ArrowUpRight, BookOpen, CheckCircle2, TrendingUp } from "lucide-react";
import { pageUser } from "@/lib/auth";
import {
  studentEnrollments,
  StudentCourses,
} from "@/components/student-courses";
export const metadata = { title: "My learning" };
export default async function Dashboard() {
  const user = await pageUser();
  const enrollments = await studentEnrollments(String(user._id));
  const stats = [
    { label: "Courses enrolled", value: enrollments.length, icon: BookOpen },
    {
      label: "Lessons completed",
      value: enrollments.reduce((a, e) => a + e.completedLessons.length, 0),
      icon: CheckCircle2,
    },
    {
      label: "Courses completed",
      value: enrollments.filter((e) => e.progress === 100).length,
      icon: TrendingUp,
    },
  ];
  return (
    <div className="container-page py-12">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">YOUR PERSONAL LEARNING SPACE</p>
          <h1 className="heading">Welcome back, {user.name.split(" ")[0]}.</h1>
          <p className="mt-3 text-muted">
            Every lesson is a step forward. Keep going.
          </p>
        </div>
        <Link href="/courses" className="btn-secondary">
          Explore courses <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div className="card flex items-center gap-5 p-6" key={s.label}>
            <span className="rounded-xl bg-mint p-3 text-brand">
              <s.icon size={22} />
            </span>
            <div>
              <p className="text-3xl font-semibold">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Pick up where you left off</h2>
        <Link href="/dashboard/courses" className="btn-ghost text-brand">
          View all
        </Link>
      </div>
      <StudentCourses enrollments={enrollments.slice(0, 6)} />
    </div>
  );
}
