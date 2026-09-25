"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Loader2, X } from "lucide-react";
import { lessonSchema, type LessonInput } from "@/lib/validations";
import { request } from "@/lib/client";
import { duration } from "@/lib/utils";
import type { LessonData } from "@/types";
import { Upload } from "./upload";
import { ConfirmButton } from "../confirm-button";
function LessonForm({
  courseId,
  lesson,
  onClose,
}: {
  courseId: string;
  lesson?: LessonData;
  onClose: () => void;
}) {
  const router = useRouter();
  const form = useForm<LessonInput>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: lesson?.title ?? "",
      description: lesson?.description ?? "",
      videoPublicId: lesson?.videoPublicId ?? "",
      isPreview: lesson?.isPreview ?? false,
    },
  });
  const publicId = useWatch({ control: form.control, name: "videoPublicId" });
  async function submit(data: LessonInput) {
    try {
      await request(
        lesson
          ? `/api/lessons/${lesson._id}`
          : `/api/courses/${courseId}/lessons`,
        { method: lesson ? "PATCH" : "POST", body: JSON.stringify(data) },
      );
      toast.success("Lesson saved");
      onClose();
      router.refresh();
    } catch (e) {
      form.setError("root", { message: (e as Error).message });
    }
  }
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="card mb-6 space-y-5 border-brand/30 p-6"
    >
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">
          {lesson ? "Edit lesson" : "Add a lesson"}
        </h3>
        <button
          type="button"
          className="btn-ghost"
          aria-label="Close lesson editor"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <label className="field">
        Lesson title
        <input {...form.register("title")} />
        {form.formState.errors.title && (
          <span className="field-error">
            {form.formState.errors.title.message}
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
      <Upload
        kind="video"
        current={publicId}
        onUploaded={(asset) =>
          form.setValue("videoPublicId", asset.public_id, {
            shouldValidate: true,
          })
        }
      />
      {form.formState.errors.videoPublicId && (
        <p className="field-error">
          {form.formState.errors.videoPublicId.message}
        </p>
      )}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="size-4 accent-brand"
          {...form.register("isPreview")}
        />
        Allow free preview
      </label>
      <p className="text-xs text-muted">
        Preview lessons can be watched without enrollment. Duration is detected
        from the uploaded video.
      </p>
      {form.formState.errors.root && (
        <p role="alert" className="field-error">
          {form.formState.errors.root.message}
        </p>
      )}
      <div className="flex gap-3">
        <button disabled={form.formState.isSubmitting} className="btn">
          {form.formState.isSubmitting && (
            <Loader2 size={16} className="animate-spin" />
          )}
          Save lesson
        </button>
        <button className="btn-secondary" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
export function LessonManager({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: LessonData[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function move(index: number, delta: number) {
    setBusy(true);
    const ids = lessons.map((l) => l._id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    try {
      await request(`/api/courses/${courseId}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ lessonIds: ids }),
      });
      router.refresh();
      toast.success("Lesson order saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-12">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Course lessons</h2>
          <p className="mt-2 text-sm text-muted">
            {lessons.length} lessons · Use the arrows to arrange your learning
            path.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setEditing("new")}
        >
          <Plus size={16} />
          Add lesson
        </button>
      </div>
      {editing && (
        <LessonForm
          key={editing}
          courseId={courseId}
          lesson={lessons.find((l) => l._id === editing)}
          onClose={() => setEditing(null)}
        />
      )}
      <div className="card divide-y divide-slate-100">
        {lessons.map((l, i) => (
          <div key={l._id} className="flex flex-wrap items-center gap-3 p-4">
            <span className="w-6 text-sm text-muted">{i + 1}.</span>
            <div className="min-w-40 flex-1">
              <p className="font-medium">{l.title}</p>
              <p className="mt-1 text-xs text-muted">
                {duration(l.duration)}
                {l.isPreview && " · Free preview"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn-ghost"
                disabled={busy || i === 0}
                aria-label={`Move ${l.title} up`}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={busy || i === lessons.length - 1}
                aria-label={`Move ${l.title} down`}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditing(l._id)}
              >
                <Pencil size={15} />
                Edit
              </button>
              <ConfirmButton
                url={`/api/lessons/${l._id}`}
                label="Delete"
                message="Delete this lesson? Completion records for this lesson will be removed and course progress recalculated."
                onDone={() => setEditing(null)}
              />
            </div>
          </div>
        ))}
        {!lessons.length && (
          <div className="p-10 text-center text-sm text-muted">
            No lessons yet. Upload your first video to get started.
          </div>
        )}
      </div>
    </section>
  );
}
