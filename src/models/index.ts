import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const options = { timestamps: true, versionKey: false } as const;
const ref = (name: string) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required: true,
});
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      maxlength: 254,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
      required: true,
    },
    active: { type: Boolean, default: true, required: true },
  },
  options,
);
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "", maxlength: 500 },
  },
  options,
);
const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true, maxlength: 15000 },
    shortDescription: { type: String, required: true, maxlength: 240 },
    thumbnail: { type: String, default: "" },
    price: { type: Number, required: true, min: 0, max: 10000 },
    category: ref("Category"),
    instructor: { type: String, required: true, maxlength: 100 },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      required: true,
    },
    published: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  options,
);
courseSchema.index({
  published: 1,
  archived: 1,
  category: 1,
  level: 1,
  createdAt: -1,
});
const lessonSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 10000 },
    videoUrl: { type: String, required: true, select: false },
    videoPublicId: { type: String, required: true, select: false },
    videoFormat: {
      type: String,
      required: true,
      default: "mp4",
      select: false,
    },
    duration: { type: Number, required: true, min: 0 },
    order: { type: Number, required: true, min: 0 },
    isPreview: { type: Boolean, default: false },
    courseId: ref("Course"),
  },
  options,
);
lessonSchema.index({ courseId: 1, order: 1, _id: 1 });
const enrollmentSchema = new Schema(
  {
    userId: ref("User"),
    courseId: ref("Course"),
    enrolledAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
  },
  options,
);
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
const paymentSchema = new Schema(
  {
    userId: ref("User"),
    courseId: ref("Course"),
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "usd", required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "expired", "failed"],
      default: "pending",
      required: true,
    },
  },
  options,
);
paymentSchema.index({ stripeSessionId: 1 }, { unique: true, sparse: true });
paymentSchema.index(
  { userId: 1, courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
    name: "one_pending_checkout",
  },
);
paymentSchema.index({ createdAt: -1 });
const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (
    (mongoose.models[name] as Model<T> | undefined) ??
    mongoose.model<T>(name, schema)
  );
}
export const User = model<InferSchemaType<typeof userSchema>>(
  "User",
  userSchema,
);
export const Category = model<InferSchemaType<typeof categorySchema>>(
  "Category",
  categorySchema,
);
export const Course = model<InferSchemaType<typeof courseSchema>>(
  "Course",
  courseSchema,
);
export const Lesson = model<InferSchemaType<typeof lessonSchema>>(
  "Lesson",
  lessonSchema,
);
export const Enrollment = model<InferSchemaType<typeof enrollmentSchema>>(
  "Enrollment",
  enrollmentSchema,
);
export const Payment = model<InferSchemaType<typeof paymentSchema>>(
  "Payment",
  paymentSchema,
);
export const RateLimit = model<InferSchemaType<typeof rateLimitSchema>>(
  "RateLimit",
  rateLimitSchema,
);
