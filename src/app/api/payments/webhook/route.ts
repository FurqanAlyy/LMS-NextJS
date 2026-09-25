import { Payment } from "@/models";
import { db } from "@/lib/db";
import { api, json, ApiError } from "@/lib/http";
import { stripe } from "@/lib/stripe";
import { fulfillCheckout } from "@/lib/fulfillment";
export const runtime = "nodejs";
export const POST = api(async (request: Request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw new ApiError(400, "Missing Stripe signature");
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    throw new ApiError(503, "Webhook is not configured");
  const payload = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new ApiError(400, "Invalid webhook signature");
  }
  await db();
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  )
    await fulfillCheckout(event.data.object);
  if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    await Payment.updateOne(
      { stripeSessionId: event.data.object.id, status: "pending" },
      {
        status:
          event.type === "checkout.session.expired" ? "expired" : "failed",
      },
    );
  }
  return json({ received: true });
});
