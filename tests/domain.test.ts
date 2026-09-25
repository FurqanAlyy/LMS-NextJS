import test from "node:test";
import assert from "node:assert/strict";
import {
  registerSchema,
  courseSchema,
  lessonSchema,
  reorderSchema,
} from "../src/lib/validations";
import { progress, safeCallback } from "../src/lib/utils";
const course = {
  title: "Web development",
  slug: "web-development",
  description: "A course about building the web.",
  shortDescription: "Build a real website.",
  thumbnail: "",
  price: 29.99,
  category: "507f1f77bcf86cd799439011",
  instructor: "LearnX",
  level: "Beginner",
  published: false,
};
test("registration rejects privilege escalation and bcrypt-truncated passwords", () => {
  const student = {
    name: "Test Student",
    email: "student@example.com",
    password: "correct horse battery",
  };
  assert.equal(registerSchema.safeParse(student).success, true);
  assert.equal(
    registerSchema.safeParse({ ...student, role: "admin" }).success,
    false,
  );
  assert.equal(
    registerSchema.safeParse({ ...student, password: "🔐".repeat(30) }).success,
    false,
  );
});
test("course validation accepts cents, disallows negative/fractional and below-minimum prices", () => {
  assert.equal(courseSchema.safeParse(course).success, true);
  for (const price of [-1, 0.1, 1.234, 10001])
    assert.equal(courseSchema.safeParse({ ...course, price }).success, false);
  assert.equal(courseSchema.safeParse({ ...course, price: 0 }).success, true);
  assert.equal(
    courseSchema.safeParse({ ...course, slug: "../../secret" }).success,
    false,
  );
});
test("lesson schema requires application-managed media and blocks injected fields", () => {
  const lesson = {
    title: "Introduction",
    description: "",
    isPreview: true,
    videoPublicId: "lms/videos/abc123",
  };
  assert.equal(lessonSchema.safeParse(lesson).success, true);
  assert.equal(
    lessonSchema.safeParse({ ...lesson, videoPublicId: "other/account/file" })
      .success,
    false,
  );
  assert.equal(
    lessonSchema.safeParse({ ...lesson, courseId: "507f1f77bcf86cd799439011" })
      .success,
    false,
  );
  assert.equal(
    reorderSchema.safeParse({ lessonIds: ["invalid"] }).success,
    false,
  );
});
test("progress counts only unique, existing lessons and handles curriculum changes", () => {
  assert.deepEqual(progress(["a", "a", "removed"], ["a", "b"]), {
    completedLessons: ["a"],
    progress: 50,
  });
  assert.equal(progress(["a"], ["a", "b", "c"]).progress, 33);
  assert.equal(progress(["a"], []).progress, 0);
});
test("callback redirects stay on the application origin", () => {
  assert.equal(safeCallback("/learn/123"), "/learn/123");
  for (const value of [
    "//evil.test",
    "https://evil.test",
    "/\\evil.test",
    null,
  ])
    assert.equal(safeCallback(value), "/dashboard");
});
