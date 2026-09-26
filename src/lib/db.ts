import mongoose from "mongoose";
import { ApiError } from "./http";

declare global {
  var mongooseCache:
    | {
        connection: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}
const cache = (globalThis.mongooseCache ??= {
  connection: null,
  promise: null,
});
export async function db() {
  if (cache.connection) return cache.connection;
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  cache.promise ??= mongoose.connect(process.env.DATABASE_URL, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10,
  });
  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    if (error instanceof mongoose.Error.MongooseServerSelectionError)
      throw new ApiError(
        503,
        "The database is temporarily unavailable. Please try again later.",
      );
    throw error;
  }
}
