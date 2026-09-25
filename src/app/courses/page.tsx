import Link from "next/link";
import { Search } from "lucide-react";
import { catalog } from "@/lib/catalog";
import { CourseCard } from "@/components/course-card";
import { EmptyState, Pagination } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explore courses" };
export default async function Courses({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    level?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const { courses, categories, total, page, pages } = await catalog(params);
  return (
    <div className="container-page py-12">
      <p className="eyebrow mb-3">A LITTLE CURIOSITY GOES A LONG WAY</p>
      <h1 className="heading">Find your next skill.</h1>
      <p className="mt-4 text-muted">
        Explore practical courses and make something of your potential.
      </p>
      <form
        action="/courses"
        className="card my-9 grid items-end gap-4 p-5 md:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <label className="field">
          <span>Search courses</span>
          <span className="relative">
            <Search size={18} className="absolute left-3 top-3.5 text-muted" />
            <input
              name="search"
              defaultValue={params.search}
              placeholder="What do you want to learn?"
              className="pl-10"
            />
          </span>
        </label>
        <label className="field">
          <span>Category</span>
          <select name="category" defaultValue={params.category ?? ""}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Level</span>
          <select name="level" defaultValue={params.level ?? ""}>
            <option value="">All levels</option>
            {["Beginner", "Intermediate", "Advanced"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <button className="btn">Find courses</button>
      </form>
      <div className="mb-6 flex items-center justify-between text-sm">
        <span className="text-muted">
          {total} {total === 1 ? "course" : "courses"} to explore
        </span>
        {(params.search || params.category || params.level) && (
          <Link href="/courses" className="text-brand underline">
            Clear filters
          </Link>
        )}
      </div>
      {courses.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c._id} course={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No courses found"
          description="Try a different search or explore another category."
          href="/courses"
          action="Clear filters"
        />
      )}
      <Pagination
        page={page}
        pages={pages}
        href={(p) =>
          `/courses?${new URLSearchParams({ ...params, page: String(p) })}`
        }
      />
    </div>
  );
}
