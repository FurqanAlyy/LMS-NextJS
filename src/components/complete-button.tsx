"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/client";
export function CompleteButton({
  lessonId,
  completed,
}: {
  lessonId: string;
  completed: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function toggle() {
    setBusy(true);
    try {
      await request("/api/progress", {
        method: "PATCH",
        body: JSON.stringify({ lessonId, completed: !completed }),
      });
      toast.success(
        completed
          ? "Lesson marked incomplete"
          : "One lesson closer. Nice work!",
      );
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      className={completed ? "btn-secondary" : "btn"}
      disabled={busy}
      onClick={toggle}
    >
      {busy ? (
        <Loader2 size={17} className="animate-spin" />
      ) : (
        <Check size={17} />
      )}
      {completed ? "Completed · Undo" : "Mark as Complete"}
    </button>
  );
}
