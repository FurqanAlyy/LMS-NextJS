"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { request } from "@/lib/client";
export function EnrollButton({
  courseId,
  price,
  owned,
  slug,
}: {
  courseId: string;
  price: number;
  owned: boolean;
  slug: string;
}) {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (owned)
    return (
      <Link className="btn w-full" href={`/learn/${courseId}`}>
        Continue Learning <ArrowRight size={17} />
      </Link>
    );
  async function enroll() {
    if (!session) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/courses/${slug}`)}`,
      );
      return;
    }
    setBusy(true);
    try {
      if (price === 0) {
        await request("/api/enrollments", {
          method: "POST",
          body: JSON.stringify({ courseId }),
        });
        toast.success("You’re enrolled. Let’s get started!");
        router.push(`/learn/${courseId}`);
        router.refresh();
      } else {
        const { url } = await request<{ url: string }>(
          "/api/payments/checkout",
          { method: "POST", body: JSON.stringify({ courseId }) },
        );
        window.location.assign(url);
      }
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <button className="btn w-full" disabled={busy} onClick={enroll}>
      {busy ? (
        <Loader2 size={17} className="animate-spin" />
      ) : (
        <ArrowRight size={17} />
      )}
      {price === 0 ? "Enroll for free" : "Buy Course"}
    </button>
  );
}
