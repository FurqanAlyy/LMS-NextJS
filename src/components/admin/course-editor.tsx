"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save, ArrowUpRight } from "lucide-react";
import { courseSchema, type CourseInput } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { request } from "@/lib/client";
import type { CategoryData, CourseData } from "@/types";
import { Upload } from "./upload";
export function CourseEditor({
  categories,
  course,
}: {
  categories: CategoryData[];
  course?: CourseData;
}) {
  const router = useRouter();
  const form = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: course
      ? {
          title: course.title,
          slug: course.slug,
          description: course.description,
          shortDescription: course.shortDescription,
          thumbnail: course.thumbnail,
          price: course.price,
          category: course.category?._id ?? "",
          instructor: course.instructor,
          level: course.level,
          published: course.published,
        }
      : {
          title: "",
          slug: "",
          description: "",
          shortDescription: "",
          thumbnail: "",
          price: 0,
          category: "",
          instructor: "",
          level: "Beginner",
          published: false,
        },
  });
  const thumbnail = useWatch({ control: form.control, name: "thumbnail" });
  async function submit(data: CourseInput) {
    try {
      const saved = await request<{ _id: string }>(
        course ? `/api/courses/${course._id}` : "/api/courses",
        { method: course ? "PATCH" : "POST", body: JSON.stringify(data) },
      );
      toast.success(
        course ? "Course saved" : "Draft created. Add your lessons below.",
      );
      if (!course) router.push(`/admin/courses/${saved._id}/edit`);
      router.refresh();
    } catch (e) {
      form.setError("root", { message: (e as Error).message });
    }
  }
  function fieldError(name: keyof CourseInput) {
    const error = form.formState.errors[name];
    return error && <span className="field-error">{error.message}</span>;
  }
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="grid items-start gap-6 xl:grid-cols-[1fr_300px]"
    >
      <div className="card space-y-5 p-6">
        <h2 className="text-xl font-semibold">Course information</h2>
        <label className="field">
          Course title
          <input
            {...form.register("title", {
              onChange: (e) => {
                if (!course && !form.formState.dirtyFields.slug)
                  form.setValue("slug", slugify(e.target.value));
              },
            })}
            placeholder="e.g. Build your first web application"
          />
          {fieldError("title")}
        </label>
        <label className="field">
          URL slug
          <input
            {...form.register("slug")}
            placeholder="build-your-first-web-application"
          />
          {fieldError("slug")}
        </label>
        <label className="field">
          Short description
          <textarea
            rows={2}
            {...form.register("shortDescription")}
            placeholder="A brief introduction for the course card."
          />
          {fieldError("shortDescription")}
        </label>
        <label className="field">
          Full description
          <textarea
            rows={7}
            {...form.register("description")}
            placeholder="What will students learn? Who is this course for?"
          />
          {fieldError("description")}
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field">
            Instructor
            <input {...form.register("instructor")} />
            {fieldError("instructor")}
          </label>
          <label className="field">
            Category
            <select {...form.register("category")}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldError("category")}
            {!categories.length && (
              <Link
                href="/admin/categories"
                className="text-xs text-brand underline"
              >
                Create a category first
              </Link>
            )}
          </label>
          <label className="field">
            Level
            <select {...form.register("level")}>
              {["Beginner", "Intermediate", "Advanced"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            {fieldError("level")}
          </label>
          <label className="field">
            Price (USD)
            <input
              type="number"
              min="0"
              max="10000"
              step="0.01"
              {...form.register("price", { valueAsNumber: true })}
            />
            <span className="text-xs text-muted">
              Set to 0 for free enrollment.
            </span>
            {fieldError("price")}
          </label>
        </div>
      </div>
      <div className="space-y-5">
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold">Course thumbnail</h2>
          {thumbnail && (
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src={thumbnail}
                alt="Course thumbnail"
                fill
                sizes="300px"
                className="object-cover"
              />
            </div>
          )}
          <Upload
            kind="image"
            current={thumbnail}
            onUploaded={(asset) =>
              form.setValue("thumbnail", asset.secure_url, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
          {fieldError("thumbnail")}
        </div>
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold">Publishing</h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              disabled={!course}
              {...form.register("published")}
            />
            Published
          </label>
          <p className="text-xs leading-5 text-muted">
            {course
              ? "A published course needs a thumbnail and at least one video lesson."
              : "Save a draft first. Add lessons, then publish your course."}
          </p>
          {form.formState.errors.root && (
            <p role="alert" className="field-error">
              {form.formState.errors.root.message}
            </p>
          )}
          <button className="btn w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {course ? "Save changes" : "Create draft"}
          </button>
          {course && (
            <Link
              className="btn-secondary w-full"
              href={`/courses/${course.slug}`}
            >
              Preview course <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}
