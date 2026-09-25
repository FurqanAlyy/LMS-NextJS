import "server-only";
import Stripe from "stripe";
import { ApiError } from "./http";
let instance: Stripe | undefined;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new ApiError(503, "Payments are not configured");
  return (instance ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
  }));
}
