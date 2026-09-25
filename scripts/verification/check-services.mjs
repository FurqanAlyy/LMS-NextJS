import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import Stripe from "stripe";
const sensitive = Object.entries(process.env)
  .filter(([k, v]) => /SECRET|PASSWORD|DATABASE_URL|API_KEY/.test(k) && v)
  .map(([, v]) => v);
const clean = (value) =>
  sensitive
    .reduce(
      (text, secret) => text.replaceAll(secret, "[REDACTED]"),
      String(value),
    )
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, "[REDACTED_URI]");
const results = await Promise.allSettled([
  (async () => {
    try {
      await mongoose.connect(process.env.DATABASE_URL, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 10000,
      });
      console.log("MongoDB: connected");
      const counts = await Promise.all(
        ["users", "courses", "categories", "lessons"].map(async (name) => [
          name,
          await mongoose.connection.db.collection(name).countDocuments(),
        ]),
      );
      console.log(
        "Database counts: " + JSON.stringify(Object.fromEntries(counts)),
      );
    } catch (e) {
      process.exitCode = 1;
      console.log("MongoDB: " + clean(e.message));
      if (e.reason?.servers)
        for (const server of e.reason.servers.values())
          console.log(
            "Server failure: " +
              clean(
                server.error?.cause?.message ??
                  server.error?.message ??
                  server.type,
              ),
          );
    } finally {
      await mongoose.disconnect();
    }
  })(),
  (async () => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const result = await cloudinary.api.ping();
    console.log("Cloudinary: " + result.status);
  })(),
  (async () => {
    if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
      console.log("Stripe: skipping live/non-test key");
      return;
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      timeout: 15000,
      maxNetworkRetries: 0,
    });
    await stripe.balance.retrieve();
    console.log("Stripe: test key accepted");
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    console.log(
      "Stripe registered webhook endpoints: " + endpoints.data.length,
    );
    console.log(
      "Stripe LMS endpoint configured: " +
        endpoints.data.some(
          (e) =>
            e.url.endsWith("/api/payments/webhook") && e.status === "enabled",
        ),
    );
  })(),
]);
for (const r of results)
  if (r.status === "rejected") {
    process.exitCode = 1;
    console.log(
      "Service check failed: " + clean(r.reason?.message ?? "Unknown error"),
    );
  }
