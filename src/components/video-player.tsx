"use client";
import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { request } from "@/lib/client";
export function VideoPlayer({
  lessonId,
  title,
}: {
  lessonId: string;
  title: string;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    request<{ url: string }>(`/api/lessons/${lessonId}/playback`, {
      signal: controller.signal,
    })
      .then((data) => setUrl(data.url))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [lessonId, attempt]);
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-[#0f1e1b] text-white">
      {url && !error && (
        <video
          aria-label={title}
          key={url}
          src={url}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          className="h-full w-full"
          onLoadedData={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onError={() => {
            setError(
              "We couldn’t play this video. Reload to get a fresh playback link.",
            );
            setLoading(false);
          }}
        />
      )}
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" aria-label="Loading video" />
        </div>
      )}
      {error && (
        <div role="alert" className="max-w-md p-6 text-center">
          <p className="text-sm">{error}</p>
          <button
            className="btn-secondary mt-4"
            onClick={() => {
              setError("");
              setUrl("");
              setLoading(true);
              setAttempt((a) => a + 1);
            }}
          >
            <RotateCcw size={15} /> Retry video
          </button>
        </div>
      )}
    </div>
  );
}
