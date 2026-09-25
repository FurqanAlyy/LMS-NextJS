import type Stripe from "stripe";
import { Enrollment, Payment } from "@/models";
import { ApiError } from "./http";
import { idSchema } from "./validations";
export async function fulfillCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" || session.mode !== "payment")
    return false;
  const paymentId = idSchema.safeParse(session.metadata?.paymentId);
  if (!paymentId.success) throw new ApiError(400, "Missing payment reference");
  const payment = await Payment.findById(paymentId.data);
  if (
    !payment ||
    session.metadata?.userId !== String(payment.userId) ||
    session.metadata?.courseId !== String(payment.courseId) ||
    session.amount_total !== payment.amount ||
    session.currency !== payment.currency ||
    (payment.stripeSessionId && payment.stripeSessionId !== session.id)
  )
    throw new ApiError(400, "Payment does not match checkout");
  // Each step is idempotent. If enrollment fails, a webhook retry repairs the incomplete operation.
  await Payment.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: "paid",
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
      },
    },
  );
  await Enrollment.findOneAndUpdate(
    { userId: payment.userId, courseId: payment.courseId },
    {
      $setOnInsert: {
        enrolledAt: new Date(),
        completedLessons: [],
        progress: 0,
      },
    },
    { upsert: true },
  );
  return true;
}
