import { z } from "zod";
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const slug = z
  .string()
  .min(2)
  .max(180)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase words separated by hyphens",
  );
export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1).max(72),
});
export const registerSchema = loginSchema
  .extend({
    name: z.string().trim().min(2).max(80),
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(72)
      .refine(
        (v) => new TextEncoder().encode(v).length <= 72,
        "Password must be at most 72 bytes",
      ),
  })
  .strict();
export const categorySchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    slug,
    description: z.string().max(500),
  })
  .strict();
export const courseSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    slug,
    description: z.string().trim().min(20).max(15000),
    shortDescription: z.string().trim().min(10).max(240),
    thumbnail: z.union([
      z.literal(""),
      z
        .url()
        .refine(
          (v) => v.startsWith("https://res.cloudinary.com/"),
          "Upload an image to Cloudinary",
        ),
    ]),
    price: z
      .number()
      .min(0)
      .max(10000)
      .refine(
        (v) => v === 0 || v >= 0.5,
        "Paid courses must cost at least $0.50",
      )
      .refine(
        (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7,
        "Use at most two decimal places",
      ),
    category: idSchema,
    instructor: z.string().trim().min(2).max(100),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    published: z.boolean(),
  })
  .strict();
export const lessonSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().max(10000),
    videoPublicId: z
      .string()
      .min(1)
      .max(250)
      .regex(/^lms\/videos\/[a-zA-Z0-9/_-]+$/, "Upload a lesson video first"),
    isPreview: z.boolean(),
  })
  .strict();
export const reorderSchema = z
  .object({ lessonIds: z.array(idSchema).min(1).max(500) })
  .strict();
export const progressSchema = z
  .object({ lessonId: idSchema, completed: z.boolean() })
  .strict();
export const enrollmentSchema = z.object({ courseId: idSchema }).strict();
export type CourseInput = z.infer<typeof courseSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type LessonInput = z.infer<typeof lessonSchema>;
