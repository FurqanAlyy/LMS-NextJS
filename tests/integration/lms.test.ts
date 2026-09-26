import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { hash } from "bcryptjs";
import Stripe from "stripe";
import {
  User,
  Category,
  Course,
  Lesson,
  Enrollment,
  Payment,
  RateLimit,
} from "../../src/models";
import { syncProgress } from "../../src/lib/courses";

// Every run starts its own MongoDB and production Next server. Never touches .env.local or a user database.
const port = 32189;
const mongoPort = 27189;
const base = `http://127.0.0.1:${port}`;
const password = randomBytes(20).toString("hex");
const webhookSecret = `whsec_${randomBytes(24).toString("hex")}`;
const stripe = new Stripe("sk_test_local_integration_only");
let mongo: ChildProcess;
let app: ChildProcess;
let directory: string;
let output = "";
let categoryId: string;
let freeId: string;
let paidId: string;
let previewId: string;
let protectedId: string;
let paidLessonId: string;
let studentId: string;
let adminId: string;
const student = new Map<string, string>();
const admin = new Map<string, string>();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function http(
  url: string,
  jar?: Map<string, string>,
  method = "GET",
  data?: unknown,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      ...(jar
        ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") }
        : {}),
      ...(data ? { "Content-Type": "application/json", origin: base } : {}),
      ...headers,
    },
    ...(data
      ? { body: typeof data === "string" ? data : JSON.stringify(data) }
      : {}),
    redirect: "manual",
  });
  for (const cookie of response.headers.getSetCookie()) {
    const item = cookie.split(";")[0];
    const i = item.indexOf("=");
    jar?.set(item.slice(0, i), item.slice(i + 1));
  }
  return response;
}
async function login(email: string, jar: Map<string, string>) {
  const csrf = await (await http("/api/auth/csrf", jar)).json();
  await http(
    "/api/auth/callback/credentials",
    jar,
    "POST",
    new URLSearchParams({
      csrfToken: csrf.csrfToken,
      email,
      password,
      callbackUrl: `${base}/dashboard`,
      json: "true",
    }).toString(),
    { "Content-Type": "application/x-www-form-urlencoded" },
  );
  const session = await (await http("/api/auth/session", jar)).json();
  assert.ok(session.user?.id, `Login failed for ${email}`);
  return session;
}
before(
  async () => {
    directory = await mkdtemp(path.join(tmpdir(), "lms-integration-"));
    mongo = spawn(
      "mongod",
      [
        "--dbpath",
        directory,
        "--port",
        String(mongoPort),
        "--bind_ip",
        "127.0.0.1",
        "--quiet",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    mongo.stdout?.on("data", (d) => {
      output += d.toString();
    });
    mongo.stderr?.on("data", (d) => {
      output += d.toString();
    });
    for (let i = 0; i < 40; i++) {
      try {
        await mongoose.connect(`mongodb://127.0.0.1:${mongoPort}/lms_test`, {
          serverSelectionTimeoutMS: 500,
        });
        break;
      } catch {
        await pause(300);
      }
    }
    assert.equal(mongoose.connection.readyState, 1, output);
    await Promise.all([
      User.init(),
      Category.init(),
      Course.init(),
      Lesson.init(),
      Enrollment.init(),
      Payment.init(),
      RateLimit.init(),
    ]);
    const adminUser = await User.create({
      name: "Test Admin",
      email: "admin@lms.test",
      password: await hash(password, 12),
      role: "admin",
    });
    adminId = String(adminUser._id);
    const category = await Category.create({
      name: "Testing",
      slug: "testing",
      description: "Test category",
    });
    categoryId = String(category._id);
    const baseCourse = {
      title: "Integration course",
      shortDescription: "An isolated integration test.",
      description: "This course exists only for automated verification.",
      category: category._id,
      instructor: "Test Instructor",
      level: "Beginner" as const,
      published: true,
      thumbnail: "",
    };
    const free = await Course.create({
      ...baseCourse,
      slug: "test-free",
      price: 0,
    });
    freeId = String(free._id);
    const paid = await Course.create({
      ...baseCourse,
      title: "Paid course",
      slug: "test-paid",
      price: 25,
    });
    paidId = String(paid._id);
    const lesson = {
      description: "Test lesson",
      videoUrl:
        "https://res.cloudinary.com/test/video/authenticated/example.mp4",
      videoPublicId: "lms/videos/integration",
      videoFormat: "mp4",
      duration: 30,
      courseId: free._id,
    };
    previewId = String(
      (
        await Lesson.create({
          ...lesson,
          title: "Preview lesson",
          order: 0,
          isPreview: true,
        })
      )._id,
    );
    protectedId = String(
      (
        await Lesson.create({
          ...lesson,
          title: "Protected lesson",
          order: 1,
          isPreview: false,
        })
      )._id,
    );
    paidLessonId = String(
      (
        await Lesson.create({
          ...lesson,
          courseId: paid._id,
          title: "Paid-only lesson",
          order: 0,
          isPreview: false,
        })
      )._id,
    );
    app = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: `mongodb://127.0.0.1:${mongoPort}/lms_test`,
          AUTH_SECRET: randomBytes(32).toString("hex"),
          NEXTAUTH_URL: base,
          STRIPE_SECRET_KEY: "sk_test_local_integration_only",
          STRIPE_WEBHOOK_SECRET: webhookSecret,
          CLOUDINARY_CLOUD_NAME: "",
          CLOUDINARY_API_KEY: "",
          CLOUDINARY_API_SECRET: "",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    app.stdout?.on("data", (d) => {
      output += d.toString();
    });
    app.stderr?.on("data", (d) => {
      output += d.toString();
    });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        const response = await fetch(`${base}/api/auth/session`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await pause(500);
    }
    assert.ok(ready, output);
    await login("admin@lms.test", admin);
  },
  { timeout: 60000 },
);
after(async () => {
  app?.kill("SIGTERM");
  await mongoose.disconnect();
  mongo?.kill("SIGTERM");
  await pause(1200);
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("registration, login, and server-side student/admin authorization", async () => {
  const escalation = await http("/api/auth/register", undefined, "POST", {
    name: "Student",
    email: "student@lms.test",
    password,
    role: "admin",
  });
  assert.equal(escalation.status, 400);
  const registration = await http("/api/auth/register", undefined, "POST", {
    name: "Test Student",
    email: "student@lms.test",
    password,
  });
  assert.equal(registration.status, 201);
  const stored = await User.findOne({ email: "student@lms.test" }).select(
    "+password",
  );
  assert.ok(stored);
  assert.notEqual(stored.password, password);
  assert.equal(stored.role, "student");
  studentId = String(stored._id);
  await login("student@lms.test", student);
  assert.equal((await http("/api/admin/users")).status, 401);
  assert.equal((await http("/api/admin/users", student)).status, 403);
  assert.equal((await http("/api/admin/users", admin)).status, 200);
  const deniedPage = await http("/admin", student);
  assert.ok([200, 307].includes(deniedPage.status));
  if (deniedPage.status === 200)
    assert.match(await deniedPage.text(), /NEXT_REDIRECT|http-equiv="refresh"/);
  assert.equal((await http("/api/courses", student, "POST", {})).status, 403);
  assert.equal(
    (await http("/api/uploads/sign", student, "POST", { kind: "video" }))
      .status,
    403,
  );
  assert.equal(
    (
      await http(
        "/api/categories",
        admin,
        "POST",
        { name: "Forged", slug: "forged", description: "" },
        { origin: "https://evil.test" },
      )
    ).status,
    403,
  );
});
test("public catalog hides drafts and lesson responses never expose protected URLs", async () => {
  await Course.create({
    title: "Hidden draft",
    slug: "hidden-draft",
    description: "A hidden course for testing.",
    shortDescription: "Hidden from students.",
    category: categoryId,
    instructor: "Test",
    level: "Beginner" as const,
    price: 0,
    published: false,
  });
  assert.equal(
    (await http(`/api/lessons/${paidLessonId}/playback`, student)).status,
    403,
  );
  assert.equal((await http("/api/courses?page=1.5")).status, 200);
  const list = await (await http("/api/courses")).json();
  assert.equal(list.total, 2);
  const details = await (await http(`/api/courses/${freeId}`)).json();
  assert.equal(details.lessons.length, 2);
  for (const lesson of details.lessons) {
    assert.equal(lesson.videoUrl, undefined);
    assert.equal(lesson.videoPublicId, undefined);
  }
  assert.equal(
    (await http(`/api/lessons/${protectedId}/playback`)).status,
    401,
  );
  assert.equal(
    (await http(`/api/lessons/${protectedId}/playback`, student)).status,
    403,
  );
  // Preview reaches the media provider (503 without Cloudinary), rather than requiring enrollment.
  assert.equal((await http(`/api/lessons/${previewId}/playback`)).status, 503);
});
test("course/category CRUD, safe deletion, and reorder validation", async () => {
  const created = await http("/api/categories", admin, "POST", {
    name: "Temporary",
    slug: "temporary",
    description: "Temporary category",
  });
  assert.equal(created.status, 201);
  const category = await created.json();
  const data = {
    title: "New draft course",
    slug: "new-draft-course",
    description: "An editable draft course for this test.",
    shortDescription: "A new course draft.",
    thumbnail: "",
    price: 0,
    category: category._id,
    instructor: "Test Admin",
    level: "Beginner" as const,
    published: false,
  };
  const response = await http("/api/courses", admin, "POST", data);
  assert.equal(response.status, 201);
  const course = await response.json();
  assert.equal(
    (
      await http(`/api/courses/${course._id}`, admin, "PATCH", {
        ...data,
        title: "Updated draft course",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await http(`/api/courses/${course._id}`, admin, "PATCH", {
        ...data,
        published: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (await http(`/api/categories/${category._id}`, admin, "DELETE")).status,
    409,
  );
  assert.equal(
    (await http(`/api/courses/${course._id}`, admin, "DELETE")).status,
    200,
  );
  assert.equal((await http(`/api/courses/${course._id}`)).status, 404);
  assert.equal(
    (
      await http(`/api/courses/${freeId}/reorder`, admin, "PUT", {
        lessonIds: [previewId, previewId],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await http(`/api/courses/${freeId}/reorder`, admin, "PUT", {
        lessonIds: [protectedId, previewId],
      })
    ).status,
    200,
  );
  const reordered = await Lesson.find({ courseId: freeId }).sort({ order: 1 });
  assert.equal(String(reordered[0]._id), protectedId);
});
test("free enrollment is unique and progress is enrollment-scoped and atomic", async () => {
  assert.equal(
    (
      await http("/api/progress", student, "PATCH", {
        lessonId: protectedId,
        completed: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (await http("/api/enrollments", student, "POST", { courseId: paidId }))
      .status,
    403,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await http("/api/enrollments", student, "POST", { courseId: freeId }))
        .status,
      201,
    );
  assert.equal(
    await Enrollment.countDocuments({ userId: studentId, courseId: freeId }),
    1,
  );
  const responses = await Promise.all(
    [previewId, protectedId].map((lessonId) =>
      http("/api/progress", student, "PATCH", { lessonId, completed: true }),
    ),
  );
  assert.deepEqual(
    responses.map((r) => r.status),
    [200, 200],
  );
  let enrollment = await Enrollment.findOne({
    userId: studentId,
    courseId: freeId,
  });
  assert.equal(enrollment?.progress, 100);
  assert.equal(enrollment?.completedLessons.length, 2);
  await http("/api/progress", student, "PATCH", {
    lessonId: previewId,
    completed: false,
  });
  enrollment = await Enrollment.findOne({
    userId: studentId,
    courseId: freeId,
  });
  assert.equal(enrollment?.progress, 50);
  assert.equal(
    (await http(`/api/lessons/${previewId}`, admin, "DELETE")).status,
    200,
  );
  enrollment = await Enrollment.findOne({
    userId: studentId,
    courseId: freeId,
  });
  assert.equal(enrollment?.progress, 100);
  await syncProgress(freeId);
  assert.equal((await Enrollment.findById(enrollment!._id))?.progress, 100);
});
test("signed payment fulfillment is verified, retry-safe, and independent of return URL", async () => {
  const payment = await Payment.create({
    userId: studentId,
    courseId: paidId,
    amount: 2500,
    currency: "usd",
    status: "pending",
    stripeSessionId: "cs_test_verified",
  });
  const session = {
    id: "cs_test_verified",
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    amount_total: 2500,
    currency: "usd",
    payment_intent: "pi_test_verified",
    metadata: {
      paymentId: String(payment._id),
      userId: studentId,
      courseId: paidId,
    },
  };
  const deliver = async (data: unknown, signature = true) => {
    const payload = JSON.stringify({
      id: "evt_test_verified",
      object: "event",
      type: "checkout.session.completed",
      data: { object: data },
    });
    const sig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: signature ? webhookSecret : "wrong",
    });
    return http("/api/payments/webhook", undefined, "POST", payload, {
      "stripe-signature": sig,
    });
  };
  await http(`/checkout/success?courseId=${paidId}`, student);
  assert.equal(
    await Enrollment.countDocuments({ userId: studentId, courseId: paidId }),
    0,
  );
  assert.equal((await deliver(session, false)).status, 400);
  assert.equal((await deliver({ ...session, amount_total: 1 })).status, 400);
  assert.equal(
    (await deliver({ ...session, payment_status: "unpaid" })).status,
    200,
  );
  assert.equal(
    await Enrollment.countDocuments({ userId: studentId, courseId: paidId }),
    0,
  );
  assert.equal((await deliver(session)).status, 200);
  assert.equal((await deliver(session)).status, 200);
  assert.equal(
    await Enrollment.countDocuments({ userId: studentId, courseId: paidId }),
    1,
  );
  assert.equal((await Payment.findById(payment._id))?.status, "paid");
  assert.equal(
    (await http(`/api/lessons/${paidLessonId}/playback`, student)).status,
    503,
    "Verified payment should pass authorization and reach the unconfigured media provider",
  );
  assert.equal(
    (await http(`/learn/${paidId}/${paidLessonId}`, student)).status,
    200,
  );

  assert.equal(
    (
      await http("/api/payments/checkout", student, "POST", {
        courseId: paidId,
      })
    ).status,
    409,
  );
});
test("suspension invalidates existing sessions and administrator accounts stay protected", async () => {
  assert.equal(
    (
      await http(`/api/admin/users/${adminId}`, admin, "PATCH", {
        active: false,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await http(`/api/admin/users/${studentId}`, admin, "PATCH", {
        active: false,
        role: "admin",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await http(`/api/admin/users/${studentId}`, admin, "PATCH", {
        active: false,
      })
    ).status,
    200,
  );
  assert.equal((await http("/api/enrollments", student)).status, 401);
  assert.equal(
    (
      await http(`/api/admin/users/${studentId}`, admin, "PATCH", {
        active: true,
      })
    ).status,
    200,
  );
  assert.equal((await http("/api/enrollments", student)).status, 200);
});

test(
  "desktop/mobile pages and browser registration/enrollment flow",
  { timeout: 90000 },
  async () => {
    const { chromium } = await import("@playwright/test");
    const { existsSync } = await import("node:fs");
    const { mkdir } = await import("node:fs/promises");
    const browser = await chromium.launch({
      headless: true,
      ...(existsSync("/usr/bin/google-chrome")
        ? { executablePath: "/usr/bin/google-chrome" }
        : {}),
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base);
      await page.getByRole("heading", { name: /Make room for/ }).waitFor();
      await mkdir("test-results", { recursive: true });
      await page.screenshot({
        path: "test-results/home-desktop.png",
        fullPage: true,
      });
      await page.goto(`${base}/register`);
      await page.getByLabel("Full name").fill("Browser Student");
      await page.getByLabel("Email address").fill("browser@lms.test");
      await page.getByLabel("Password", { exact: false }).fill(password);
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .click();
      await page.waitForURL("**/dashboard");
      await page
        .getByRole("heading", { name: /Welcome back, Browser/ })
        .waitFor();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.waitForURL(`${base}/`);
      assert.deepEqual(
        await (await page.request.get(`${base}/api/auth/session`)).json(),
        {},
      );
      await page.getByRole("link", { name: "Log in", exact: true }).click();
      await page.getByLabel("Email address").fill("browser@lms.test");
      await page
        .getByLabel("Password", { exact: true })
        .fill("incorrect-password");
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Incorrect email or password" })
        .waitFor();
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page.waitForURL("**/dashboard");
      await page
        .getByRole("heading", { name: /Welcome back, Browser/ })
        .waitFor();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Toggle menu" }).click();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.waitForURL(`${base}/`);
      assert.deepEqual(
        await (await page.request.get(`${base}/api/auth/session`)).json(),
        {},
      );
      await page.goto(`${base}/login?callbackUrl=%2Fdashboard%2Fcourses`);
      await page.getByLabel("Email address").fill("browser@lms.test");
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page.waitForURL("**/dashboard/courses");
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${base}/admin`);
      await page.waitForURL("**/dashboard");
      await page.goto(`${base}/courses/test-free`);
      await page.getByRole("button", { name: "Enroll for free" }).click();
      await page.waitForURL(`**/learn/${freeId}/**`);
      // The test deliberately has no Cloudinary credentials. Media error handling must be usable.
      await page.getByRole("button", { name: "Retry video" }).waitFor();
      // Browser-only fixture: verify decoding/playback with the real downloaded MP4.
      // Authorization above still runs against the real API; no production media bypass exists.
      await page.route(`**/api/lessons/${protectedId}/playback`, (route) =>
        route.fulfill({
          json: { url: `${base}/__test-video.mp4`, expiresIn: 3600 },
        }),
      );
      await page.route("**/__test-video.mp4", (route) =>
        route.fulfill({
          path: path.resolve("seed-assets/sample-lesson.mp4"),
          contentType: "video/mp4",
        }),
      );
      await page.getByRole("button", { name: "Retry video" }).click();
      await page.waitForFunction(
        () => (document.querySelector("video")?.readyState ?? 0) >= 2,
      );
      await page.locator("video").evaluate((video) => {
        (video as HTMLVideoElement).muted = true;
        return (video as HTMLVideoElement).play();
      });
      await page.waitForFunction(
        () => (document.querySelector("video")?.currentTime ?? 0) > 0.1,
      );
      await page
        .locator("video")
        .evaluate((video) => (video as HTMLVideoElement).pause());
      const videoBox = await page.locator("video:visible").boundingBox();
      const sidebarBox = await page.locator("aside:visible").boundingBox();
      assert.ok(
        videoBox &&
          sidebarBox &&
          videoBox.x > sidebarBox.x &&
          videoBox.width > sidebarBox.width,
        "Desktop learning layout must put the large video to the right of the sidebar",
      );
      await page.screenshot({
        path: "test-results/lesson-desktop.png",
        fullPage: true,
      });

      await page.getByRole("button", { name: "Mark as Complete" }).click();
      await page.getByRole("button", { name: "Completed · Undo" }).waitFor();
      await page.goto(`${base}/dashboard`);
      await page.getByText("100%", { exact: true }).waitFor();
      await page.screenshot({
        path: "test-results/dashboard-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/courses`);
      await page
        .getByRole("heading", { name: "Find your next skill." })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
        "Mobile catalog must not overflow",
      );
      await page.screenshot({
        path: "test-results/catalog-mobile.png",
        fullPage: true,
      });
      await page.getByRole("button", { name: "Toggle menu" }).click();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.waitForURL(base + "/");
      await page.goto(`${base}/login`);
      await page.getByLabel("Email address").fill("admin@lms.test");
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page.waitForURL("**/dashboard");
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${base}/admin`);
      await page
        .getByRole("heading", { name: "A big-picture view." })
        .waitFor();
      await page.screenshot({
        path: "test-results/admin-desktop.png",
        fullPage: true,
      });
      await page.goto(`${base}/admin/categories`);
      await page
        .getByRole("textbox", { name: "Name", exact: true })
        .fill("Browser category");
      await page
        .getByRole("button", { name: "Create category", exact: true })
        .click();
      await page
        .getByRole("cell", { name: "Browser category /browser-category" })
        .waitFor();
      assert.deepEqual(
        errors,
        [],
        "Browser must not report uncaught runtime errors",
      );
    } finally {
      await browser.close();
    }
  },
);
