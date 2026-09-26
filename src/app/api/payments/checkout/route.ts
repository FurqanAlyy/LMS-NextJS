import { Course, Enrollment, Payment } from "@/models";
import { requireUser } from "@/lib/auth";
import { api, body, json, ApiError } from "@/lib/http";
import { enrollmentSchema } from "@/lib/validations";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";
export const POST = api(async (request: Request) => {
  const user = await requireUser();
  await rateLimit(`checkout:${user._id}`, 20, 600);
  const { courseId } = await body(request, enrollmentSchema);
  const course = await Course.findOne({
    _id: courseId,
    published: true,
    archived: false,
  });
  if (!course) throw new ApiError(404, "Course not found");
  if (course.price <= 0)
    throw new ApiError(400, "Use free enrollment for this course");
  const pair = { userId: user._id, courseId: course._id };
  if (await Enrollment.exists(pair))
    throw new ApiError(409, "You already own this course");
  if (await Payment.exists({ ...pair, status: "paid" }))
    throw new ApiError(
      409,
      "Your payment is being confirmed. Check your dashboard shortly.",
    );
  const client = stripe();
  if (!process.env.NEXTAUTH_URL)
    throw new ApiError(503, "Application URL is not configured");
  const payment = await Payment.findOneAndUpdate(
    { ...pair, status: "pending" },
    {
      $setOnInsert: { amount: Math.round(course.price * 100), currency: "usd" },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (payment.stripeSessionId) {
    const existing = await client.checkout.sessions.retrieve(
      payment.stripeSessionId,
    );
    if (existing.status === "open" && existing.url) {
      if (
        existing.payment_method_types.length === 1 &&
        existing.payment_method_types[0] === "card"
      )
        return json({ url: existing.url });
      // Retire checkouts created before the card-only payment policy.
      await client.checkout.sessions.expire(existing.id);
    }
    if (existing.status === "complete")
      throw new ApiError(
        409,
        "Payment is processing. Check your dashboard shortly.",
      );
    await Payment.updateOne(
      { _id: payment._id, status: "pending" },
      { status: "expired" },
    );
    throw new ApiError(
      409,
      "Your previous checkout expired. Please click Buy Course again.",
    );
  }
  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      client_reference_id: String(user._id),
      line_items: [
        {
          price_data: {
            currency: payment.currency,
            unit_amount: payment.amount,
            product_data: { name: course.title },
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: String(payment._id),
        userId: String(user._id),
        courseId,
      },
      success_url: `${process.env.NEXTAUTH_URL}/checkout/success?courseId=${courseId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/courses/${course.slug}?checkout=cancelled`,
    },
    { idempotencyKey: `checkout-card-only-${payment._id}` },
  );
  await Payment.updateOne(
    { _id: payment._id },
    { stripeSessionId: session.id },
  );
  return json({ url: session.url });
});
