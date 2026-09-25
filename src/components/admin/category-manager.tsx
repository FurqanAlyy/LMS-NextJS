"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Loader2 } from "lucide-react";
import { categorySchema, type CategoryInput } from "@/lib/validations";
import { request } from "@/lib/client";
import { slugify } from "@/lib/utils";
import type { CategoryData } from "@/types";
import { ConfirmButton } from "../confirm-button";
export function CategoryManager({
  categories,
}: {
  categories: CategoryData[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const router = useRouter();
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", description: "" },
  });
  function edit(category?: CategoryData) {
    setEditing(category?._id ?? null);
    form.reset({
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
    });
  }
  async function submit(data: CategoryInput) {
    try {
      await request(
        editing ? `/api/categories/${editing}` : "/api/categories",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(data) },
      );
      toast.success("Category saved");
      edit();
      router.refresh();
    } catch (e) {
      form.setError("root", { message: (e as Error).message });
    }
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c._id}>
                <td>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-1 text-xs text-muted">/{c.slug}</p>
                </td>
                <td>
                  <div className="flex">
                    <button className="btn-ghost" onClick={() => edit(c)}>
                      <Pencil size={15} />
                      Edit
                    </button>
                    <ConfirmButton
                      url={`/api/categories/${c._id}`}
                      label="Delete"
                      message="Delete this category? Categories assigned to courses must be reassigned first."
                      onDone={() => edit()}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {!categories.length && (
              <tr>
                <td colSpan={2} className="text-muted">
                  No categories yet. Add one to organize your courses.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="card space-y-5 p-6"
      >
        <h2 className="text-lg font-semibold">
          {editing ? "Edit category" : "New category"}
        </h2>
        <label className="field">
          Name
          <input
            {...form.register("name", {
              onChange: (e) => {
                if (!editing && !form.formState.dirtyFields.slug)
                  form.setValue("slug", slugify(e.target.value));
              },
            })}
          />
          {form.formState.errors.name && (
            <span className="field-error">
              {form.formState.errors.name.message}
            </span>
          )}
        </label>
        <label className="field">
          Slug
          <input {...form.register("slug")} />
          {form.formState.errors.slug && (
            <span className="field-error">
              {form.formState.errors.slug.message}
            </span>
          )}
        </label>
        <label className="field">
          Description
          <textarea rows={3} {...form.register("description")} />
          {form.formState.errors.description && (
            <span className="field-error">
              {form.formState.errors.description.message}
            </span>
          )}
        </label>
        {form.formState.errors.root && (
          <p role="alert" className="field-error">
            {form.formState.errors.root.message}
          </p>
        )}
        <button className="btn w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          {editing ? "Save category" : "Create category"}
        </button>
        {editing && (
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => edit()}
          >
            Cancel editing
          </button>
        )}
      </form>
    </div>
  );
}
