import { notFound } from "next/navigation";
import { pageUser } from "@/lib/auth";
import { idSchema } from "@/lib/validations";
import { PaymentStatus } from "@/components/payment-status";
export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  await pageUser();
  const { courseId } = await searchParams;
  if (!idSchema.safeParse(courseId).success) notFound();
  return <PaymentStatus courseId={courseId!} />;
}
