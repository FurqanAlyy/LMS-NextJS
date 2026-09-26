"use client";
import { useState } from "react";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { request } from "@/lib/client";
type Result = { secure_url: string; public_id: string };
type Signature = {
  params: Record<string, string | number | boolean>;
  signature: string;
  apiKey: string;
  cloudName: string;
  resourceType: string;
};
export function Upload({
  kind,
  onUploaded,
  current,
}: {
  kind: "image" | "video";
  onUploaded: (asset: Result) => void;
  current?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("Preparing upload…");
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    const max = kind === "image" ? 5 : 100;
    const types =
      kind === "image"
        ? ["image/jpeg", "image/png", "image/webp"]
        : ["video/mp4", "video/webm", "video/quicktime"];
    if (!types.includes(file.type) || file.size > max * 1024 * 1024) {
      setError(
        `Choose a ${kind === "image" ? "JPG, PNG, or WebP" : "MP4, WebM, or MOV"} file under ${max} MB.`,
      );
      return;
    }
    setBusy(true);
    setProgress(0);
    setPhase("Preparing upload…");
    try {
      let signed: Signature;
      const controller = new AbortController();
      const preparationTimer = setTimeout(() => controller.abort(), 20000);
      try {
        signed = await request<Signature>("/api/uploads/sign", {
          method: "POST",
          body: JSON.stringify({ kind }),
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted)
          throw new Error(
            "Upload authorization timed out. Check your connection and try again.",
          );
        throw error;
      } finally {
        clearTimeout(preparationTimer);
      }
      setPhase("Connecting to Cloudinary…");
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signed.apiKey);
      form.append("signature", signed.signature);
      Object.entries(signed.params).forEach(([k, v]) =>
        form.append(k, String(v)),
      );
      const result = await new Promise<Result>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let stallTimer: ReturnType<typeof setTimeout> | undefined;
        const fail = (message: string) => {
          clearTimeout(stallTimer);
          reject(new Error(message));
        };
        const watchProgress = (processing = false) => {
          clearTimeout(stallTimer);
          stallTimer = setTimeout(
            () => {
              fail(
                processing
                  ? "Cloudinary is taking too long to process this file. Please try again."
                  : "Upload stalled while connecting or sending data to Cloudinary. Check your network, VPN, or firewall, then try again.",
              );
              xhr.abort();
            },
            processing ? 180000 : 30000,
          );
        };
        xhr.open(
          "POST",
          `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`,
        );
        xhr.timeout = 600000;
        xhr.upload.onprogress = (e) => {
          setPhase("Uploading…");
          watchProgress();
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.upload.onload = () => {
          setProgress(100);
          setPhase("Processing upload…");
          watchProgress(true);
        };
        xhr.onloadend = () => clearTimeout(stallTimer);
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              if (!data.secure_url || !data.public_id)
                throw new Error("Missing upload result");
              resolve(data);
            } else reject(new Error(data.error?.message ?? "Upload failed"));
          } catch {
            reject(new Error("Invalid upload response"));
          }
        };
        xhr.onerror = () =>
          fail(
            "Could not reach Cloudinary. Check your network, VPN, or firewall and try again.",
          );
        xhr.onabort = () => fail("Upload cancelled. Please try again.");
        xhr.ontimeout = () =>
          fail("Upload timed out. Try a smaller file or a faster connection.");
        watchProgress();
        try {
          xhr.send(form);
        } catch (error) {
          clearTimeout(stallTimer);
          reject(error);
        }
      });
      onUploaded(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-xl bg-white p-2 text-brand">
          {current ? <CheckCircle2 size={22} /> : <UploadCloud size={22} />}
        </span>
        <div>
          <p className="text-sm font-medium">
            {current
              ? "Upload a replacement"
              : `Upload ${kind === "image" ? "thumbnail" : "lesson video"}`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {kind === "image"
              ? "JPG, PNG, WebP · Up to 5 MB"
              : "MP4, WebM, MOV · Up to 100 MB"}
          </p>
        </div>
      </div>
      <input
        aria-label={`Upload ${kind}`}
        type="file"
        accept={
          kind === "image"
            ? "image/jpeg,image/png,image/webp"
            : "video/mp4,video/webm,video/quicktime"
        }
        disabled={busy}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="bg-white text-xs"
      />
      {busy && (
        <div role="status" className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-brand"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {phase === "Uploading…" ? `Uploading… ${progress}%` : phase}
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="field-error mt-3">
          {error}
        </p>
      )}
      {current && !busy && (
        <p className="mt-3 truncate text-xs text-brand">
          ✓ Uploaded. Save your changes to attach this file.
        </p>
      )}
    </div>
  );
}
