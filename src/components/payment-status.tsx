"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { request } from "@/lib/client";
export function PaymentStatus({ courseId }: { courseId: string }) {
  const [owned, setOwned] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let active = true;
    let attempts = 0;
    const poll = async () => {
      try {
        const data =
          await request<{ courseId: { _id: string } }[]>("/api/enrollments");
        if (active && data.some((e) => e.courseId?._id === courseId)) {
          setOwned(true);
          clearInterval(timer);
        }
      } catch {
        /* Keep polling after transient errors. */
      }
      if (++attempts >= 20) {
        if (active) setSlow(true);
        clearInterval(timer);
      }
    };
    const timer = setInterval(poll, 3000);
    void poll();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [courseId]);
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-mint text-brand">
        {owned ? (
          <CheckCircle2 size={32} />
        ) : (
          <Loader2 size={30} className={slow ? "" : "animate-spin"} />
        )}
      </span>
      <h1 className="heading">
        {owned ? "Your next chapter is ready." : "Confirming your payment"}
      </h1>
      <p className="my-5 leading-7 text-muted">
        {owned
          ? "You’re enrolled! Your course is waiting for you."
          : slow
            ? "Confirmation is taking a little longer. Access appears in your dashboard after payment is verified. Please don’t pay again."
            : "We’re waiting for secure payment confirmation. This page will update automatically."}
      </p>
      <Link className="btn" href={owned ? `/learn/${courseId}` : "/dashboard"}>
        {owned ? "Start learning" : "Go to my dashboard"}
      </Link>
    </div>
  );
}
