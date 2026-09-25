import { createHash } from "node:crypto";
import { RateLimit } from "@/models";
import { db } from "./db";
import { ApiError } from "./http";
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds = 900,
) {
  await db();
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const hash = createHash("sha256").update(`${key}:${bucket}`).digest("hex");
  const record = await RateLimit.findOneAndUpdate(
    { key: hash },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        expiresAt: new Date((bucket + 1) * windowSeconds * 1000),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (record.count > limit)
    throw new ApiError(429, "Too many attempts. Please try again later.");
}
