"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { request } from "@/lib/client";
export function ConfirmButton({
  url,
  label,
  message,
  method = "DELETE",
  payload,
  onDone,
}: {
  url: string;
  label: string;
  message: string;
  method?: string;
  payload?: unknown;
  onDone?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function confirm() {
    setBusy(true);
    try {
      const data = await request<{ message?: string }>(url, {
        method,
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      toast.success(data.message ?? "Saved");
      dialog.current?.close();
      onDone?.();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="btn-ghost text-red-700"
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-ink shadow-xl backdrop:bg-ink/40"
        onClick={(e) => {
          if (e.target === dialog.current && !busy) dialog.current.close();
        }}
      >
        <h2 className="text-xl font-semibold">{label}?</h2>
        <p className="mt-3 whitespace-normal text-sm leading-6 text-muted">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn bg-red-700 hover:bg-red-800"
            disabled={busy}
            onClick={confirm}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {label}
          </button>
        </div>
      </dialog>
    </>
  );
}
