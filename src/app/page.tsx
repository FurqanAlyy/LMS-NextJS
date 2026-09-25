import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Compass,
  Play,
  Sparkles,
  Layers3,
} from "lucide-react";
import { catalog } from "@/lib/catalog";
import { CourseCard } from "@/components/course-card";
import { EmptyState } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { courses, categories } = await catalog();
  return (
    <>
      <section className="container-page grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <span className="badge mb-6">
            <span className="size-1.5 rounded-full bg-brand" /> SMALL STEPS.
            REAL SKILLS.
          </span>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.09] tracking-[-.055em] sm:text-6xl lg:text-7xl">
            Make room for
            <br />
            your{" "}
            <span className="font-serif italic font-normal text-brand">
              next skill.
            </span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-muted">
            Turn your curiosity into something you can create. Practical
            courses. Clear next steps. All at your own pace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses" className="btn">
              Find your next course <ArrowUpRight size={18} />
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              My learning <ArrowRight size={17} />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-5 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Check size={15} className="text-brand" /> Learn at your pace
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={15} className="text-brand" /> Build practical skills
            </span>
          </div>
        </div>
        <div className="relative rounded-[2rem] bg-[#e5eee3] p-6 sm:p-10">
          <div className="absolute right-7 top-7 text-brand/25">
            <Sparkles size={52} strokeWidth={1} />
          </div>
          <div className="relative mx-auto max-w-sm">
            <p className="eyebrow mb-6">Your next chapter starts here</p>
            <div className="rounded-2xl bg-ink p-6 text-white shadow-xl shadow-ink/10">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-emerald-200">
                  Learn → Build → Grow
                </span>
                <Code2 size={24} />
              </div>
              <div className="my-7 font-mono text-sm leading-7">
                <span className="text-emerald-300">const</span> yourNextChapter
                = {"{"}
                <br />
                <span className="pl-4">
                  curiosity: <span className="text-amber-200">true</span>,
                </span>
                <br />
                <span className="pl-4">
                  possibilities:{" "}
                  <span className="text-amber-200">&apos;endless&apos;</span>
                </span>
                <br />
                {"};"}
              </div>
              <div className="flex items-center gap-3 border-t border-white/15 pt-4 text-sm">
                <span className="flex size-9 items-center justify-center rounded-full bg-white text-ink">
                  <Play size={14} fill="currentColor" />
                </span>
                One lesson closer.
              </div>
            </div>
            <div className="ml-7 mt-4 space-y-3 rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-muted">
                A simple way to move forward
              </p>
              {[
                ["01", "Find what sparks your interest"],
                ["02", "Learn a little, build a little"],
                ["03", "Put your new skills to work"],
              ].map(([n, t]) => (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-mint text-xs text-brand">
                    {n}
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-slate-200 bg-white">
        <div className="container-page grid gap-8 py-8 sm:grid-cols-3">
          {[
            [
              Compass,
              "Follow your curiosity",
              "Find a subject that feels like your next step.",
            ],
            [
              Layers3,
              "Learn by doing",
              "Bring each lesson into your own projects.",
            ],
            [Check, "See your progress", "Pick up right where you left off."],
          ].map(([Icon, title, description]) => {
            const I = Icon as typeof Compass;
            return (
              <div key={String(title)} className="flex gap-4">
                <I className="mt-1 shrink-0 text-brand" size={23} />
                <div>
                  <h2 className="font-semibold">{String(title)}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {String(description)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="container-page py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">THE COURSE COLLECTION</p>
            <h2 className="heading">What will you learn next?</h2>
          </div>
          <Link href="/courses" className="btn-ghost text-brand">
            Explore all courses <ArrowRight size={17} />
          </Link>
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/courses"
            className="rounded-full bg-ink px-4 py-2 text-sm text-white"
          >
            All courses
          </Link>
          {categories.slice(0, 5).map((c) => (
            <Link
              key={c._id}
              href={`/courses?category=${c.slug}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-brand"
            >
              {c.name}
            </Link>
          ))}
        </div>
        {courses.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((c) => (
              <CourseCard key={c._id} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Good things are on the way"
            description="Our course collection is being prepared. Check back soon for your next learning adventure."
          />
        )}
      </section>
      <section className="container-page pb-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink p-8 text-white sm:flex-row sm:items-center sm:p-12">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-emerald-200">
              MAKE THIS WEEKEND COUNT
            </p>
            <h2 className="text-3xl font-semibold">
              Your future self will thank you.
            </h2>
            <p className="mt-3 text-sm text-white/60">
              Create an account and start your next chapter.
            </p>
          </div>
          <Link className="btn-secondary shrink-0" href="/register">
            Start learning <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
