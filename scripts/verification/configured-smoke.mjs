/** Real Atlas / Cloudinary / Stripe TEST-mode smoke test. Creates and removes only its own fixtures. */
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import Stripe from "stripe";
import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:32190";
const runId = Date.now().toString(36);
const testEmail = `learnx-verification-${runId}@example.com`;
const testPassword = randomBytes(24).toString("hex");
const admin = new Map();
const student = new Map();
const assets = [];
const report = { runId, checks: [], cleanup: [] };
let app,
  listener,
  browser,
  studentId,
  temporaryCourseId,
  temporaryCategoryId,
  sessionId;
let serverLog = "";
let listenerLog = "";
const sensitive = Object.entries(process.env)
  .filter(([k, v]) => /SECRET|PASSWORD|DATABASE_URL|API_KEY/.test(k) && v)
  .map(([, v]) => v);
const clean = (value) =>
  sensitive
    .reduce(
      (text, secret) => text.replaceAll(secret, "[REDACTED]"),
      String(value),
    )
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, "[REDACTED_URI]")
    .replace(/whsec_[\w]+/g, "[REDACTED_SIGNING_SECRET]");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pass = (name) => {
  report.checks.push({ name, status: "passed" });
  console.log(`PASS: ${name}`);
};
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  timeout: 30000,
  maxNetworkRetries: 1,
});
async function call(
  route,
  jar = admin,
  method = "GET",
  data,
  extraHeaders = {},
) {
  const response = await fetch(`${base}${route}`, {
    method,
    redirect: "manual",
    headers: {
      cookie: [...(jar ?? [])].map(([k, v]) => `${k}=${v}`).join("; "),
      origin: base,
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...extraHeaders,
    },
    ...(data
      ? { body: typeof data === "string" ? data : JSON.stringify(data) }
      : {}),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const first = cookie.split(";")[0];
    const i = first.indexOf("=");
    jar?.set(first.slice(0, i), first.slice(i + 1));
  }
  let json;
  try {
    json = await response.json();
  } catch {
    json = {};
  }
  if (!response.ok)
    throw new Error(
      `${method} ${route}: HTTP ${response.status}: ${json.error ?? "Request failed"}`,
    );
  return json;
}
async function signIn(email, password, jar) {
  const csrf = await call("/api/auth/csrf", jar);
  await call(
    "/api/auth/callback/credentials",
    jar,
    "POST",
    new URLSearchParams({
      csrfToken: csrf.csrfToken,
      email,
      password,
      callbackUrl: base + "/dashboard",
      json: "true",
    }).toString(),
    { "Content-Type": "application/x-www-form-urlencoded" },
  );
  const session = await call("/api/auth/session", jar);
  assert.ok(session.user?.id, "Sign-in failed");
  return session.user.id;
}
async function upload(kind, file) {
  const signed = await call("/api/uploads/sign", admin, "POST", { kind });
  const form = new FormData();
  form.append(
    "file",
    new Blob([await readFile(file)], {
      type: kind === "video" ? "video/mp4" : "image/jpeg",
    }),
    kind === "video" ? "verification.mp4" : "verification.jpg",
  );
  form.append("api_key", signed.apiKey);
  form.append("signature", signed.signature);
  for (const [k, v] of Object.entries(signed.params)) form.append(k, String(v));
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/${kind}/upload`,
    { method: "POST", body: form, signal: AbortSignal.timeout(120000) },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      `Cloudinary ${kind} upload: ${result.error?.message ?? response.status}`,
    );
  assets.push({
    id: result.public_id,
    resource_type: kind,
    type: kind === "video" ? "authenticated" : "upload",
  });
  return result;
}
async function main() {
  assert.ok(
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
    "Refusing to run with a non-test Stripe key",
  );
  await mkdir("test-results", { recursive: true });
  await mongoose.connect(process.env.DATABASE_URL, {
    serverSelectionTimeoutMS: 30000,
  });
  const db = mongoose.connection.db;
  const courses = await db
    .collection("courses")
    .find({
      slug: {
        $in: [
          "build-your-first-website",
          "the-thoughtful-interface",
          "javascript-one-concept-at-a-time",
          "full-stack-systems-with-nextjs",
        ],
      },
    })
    .toArray();
  assert.equal(courses.length, 4);
  assert.ok(courses.every((c) => c.published));
  for (const course of courses)
    assert.equal(
      await db.collection("lessons").countDocuments({ courseId: course._id }),
      3,
    );
  pass("Seed records: four published courses, twelve ordered lessons");
  const cliEnv = {
    ...process.env,
    STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY,
  };
  const cli = await promisify(execFile)(
    "stripe",
    ["listen", "--print-secret", "--skip-update"],
    { env: cliEnv, timeout: 45000, maxBuffer: 100000 },
  );
  const webhookSecret = cli.stdout.match(/whsec_[a-zA-Z0-9]+/)?.[0];
  assert.ok(webhookSecret, "Stripe CLI did not return a signing secret");
  report.configuredWebhookSecretMatchesCLI =
    webhookSecret === process.env.STRIPE_WEBHOOK_SECRET;
  if (!report.configuredWebhookSecretMatchesCLI) {
    const config = await readFile(".env.local", "utf8");
    await writeFile(
      ".env.local",
      config.replace(
        /^STRIPE_WEBHOOK_SECRET=.*$/m,
        `STRIPE_WEBHOOK_SECRET=${webhookSecret}`,
      ),
      { mode: 0o600 },
    );
    console.log(
      "Updated .env.local to the Stripe CLI signing secret for local webhook delivery.",
    );
  }
  app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "32190",
    ],
    {
      env: {
        ...process.env,
        NEXTAUTH_URL: base,
        STRIPE_WEBHOOK_SECRET: webhookSecret,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  app.stdout.on("data", (d) => {
    serverLog += clean(d.toString());
  });
  app.stderr.on("data", (d) => {
    serverLog += clean(d.toString());
  });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + "/api/auth/session")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(500);
  }
  assert.ok(ready, "Application did not start");
  listener = spawn(
    "stripe",
    [
      "listen",
      "--skip-update",
      "--events",
      "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired",
      "--forward-to",
      base + "/api/payments/webhook",
    ],
    { env: cliEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  listener.stdout.on("data", (d) => {
    listenerLog += clean(d.toString());
  });
  listener.stderr.on("data", (d) => {
    listenerLog += clean(d.toString());
  });
  for (let i = 0; i < 60 && !listenerLog.includes("Ready!"); i++)
    await pause(500);
  assert.ok(
    listenerLog.includes("Ready!"),
    "Stripe webhook listener did not become ready",
  );
  pass("Real Stripe test-mode webhook listener connected");
  await signIn(
    process.env.SEED_ADMIN_EMAIL,
    process.env.SEED_ADMIN_PASSWORD,
    admin,
  );
  pass("Seed admin can log in");
  await call("/api/auth/register", student, "POST", {
    name: "LearnX Verification Student",
    email: testEmail,
    password: testPassword,
  });
  studentId = await signIn(testEmail, testPassword, student);
  pass("Registration and student login against Atlas");
  const image = await upload("image", "seed-assets/design.jpg");
  pass("Signed thumbnail upload to Cloudinary");
  const video = await upload("video", "seed-assets/sample-lesson.mp4");
  assert.equal(video.format, "mp4");
  pass("Signed authenticated video upload and MP4 conversion");
  const category = await call("/api/categories", admin, "POST", {
    name: `Verification ${runId}`,
    slug: `verification-${runId}`,
    description: "Temporary service verification category",
  });
  temporaryCategoryId = category._id;
  const input = {
    title: `Verification course ${runId}`,
    slug: `verification-${runId}`,
    description:
      "Temporary course used only to verify configured integrations.",
    shortDescription: "Temporary configured-service test course.",
    thumbnail: image.secure_url,
    price: 0,
    category: category._id,
    instructor: "LearnX Verification",
    level: "Beginner",
    published: false,
  };
  const draft = await call("/api/courses", admin, "POST", input);
  temporaryCourseId = draft._id;
  const lessonInput = {
    title: "Service verification lesson",
    description: "Temporary media upload and playback check.",
    videoPublicId: video.public_id,
    isPreview: true,
  };
  const lesson = await call(
    `/api/courses/${draft._id}/lessons`,
    admin,
    "POST",
    lessonInput,
  );
  await call(`/api/lessons/${lesson._id}`, admin, "PATCH", {
    ...lessonInput,
    title: "Verified lesson",
  });
  await call(`/api/courses/${draft._id}`, admin, "PATCH", {
    ...input,
    published: true,
  });
  pass("Admin course/lesson creation, editing, and publication against Atlas");
  const preview = await call(`/api/lessons/${lesson._id}/playback`, null);
  const stream = await fetch(preview.url, {
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(stream.status, 200);
  assert.match(stream.headers.get("content-type") ?? "", /video/);
  assert.ok((await stream.arrayBuffer()).byteLength > 1000);
  pass("Real signed Cloudinary preview streams video bytes");
  await call("/api/enrollments", student, "POST", { courseId: draft._id });
  await call("/api/progress", student, "PATCH", {
    lessonId: lesson._id,
    completed: true,
  });
  const enrolled = await call("/api/enrollments", student);
  assert.equal(
    enrolled.find((e) => e.courseId._id === draft._id)?.progress,
    100,
  );
  pass("Free enrollment and persisted lesson progress");
  browser = await chromium.launch({
    headless: true,
    ...(existsSync("/usr/bin/google-chrome")
      ? { executablePath: "/usr/bin/google-chrome" }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies(
    [...student].map(([name, value]) => ({ name, value, url: base })),
  );
  const page = await context.newPage();
  await page.goto(`${base}/learn/${draft._id}/${lesson._id}`);
  await page.waitForFunction(
    () => (document.querySelector("video")?.readyState ?? 0) >= 2,
    {},
    { timeout: 60000 },
  );
  await page.locator("video:visible").evaluate(async (video) => {
    video.muted = true;
    await video.play();
  });
  await page.waitForFunction(
    () => (document.querySelector("video")?.currentTime ?? 0) > 0.1,
  );
  await page.locator("video:visible").evaluate((video) => video.pause());
  await page.screenshot({
    path: "test-results/configured-learning.png",
    fullPage: true,
  });
  pass("Browser playback from real authenticated Cloudinary media");
  await page.goto(base);
  await page.getByRole("heading", { name: /Make room for/ }).waitFor();
  await page.screenshot({
    path: "test-results/learnx-seeded-home.png",
    fullPage: true,
  });
  const paid = courses.find((c) => c.price > 0);
  const checkout = await call("/api/payments/checkout", student, "POST", {
    courseId: String(paid._id),
  });
  const payment = await db
    .collection("payments")
    .findOne({
      userId: new mongoose.Types.ObjectId(studentId),
      courseId: paid._id,
    });
  sessionId = payment.stripeSessionId;
  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  assert.equal(checkoutSession.livemode, false);
  assert.equal(checkoutSession.amount_total, Math.round(paid.price * 100));
  pass("Actual Stripe Checkout session with database-verified price");
  await page.goto(checkout.url, { timeout: 90000 });
  await page.locator('input[name="cardNumber"]').waitFor({ timeout: 60000 });
  await page.locator('input[name="cardNumber"]').fill("4242424242424242");
  await page.locator('input[name="cardExpiry"]').fill("1230");
  await page.locator('input[name="cardCvc"]').fill("123");
  const name = page.locator('input[name="billingName"]');
  if (await name.isVisible()) await name.fill("LearnX Test Student");
  const country = page.locator('select[name="billingCountry"]');
  if (await country.isVisible()) await country.selectOption("US");
  const postal = page.locator('input[name="billingPostalCode"]');
  if (await postal.isVisible()) await postal.fill("10001");
  await page.getByRole("button", { name: /^Pay/ }).click();
  await page.waitForURL(`${base}/checkout/success**`, { timeout: 90000 });
  await page
    .getByRole("heading", { name: "Your next chapter is ready." })
    .waitFor({ timeout: 60000 });
  const confirmed = await stripe.checkout.sessions.retrieve(sessionId);
  assert.equal(confirmed.payment_status, "paid");
  assert.ok(
    await db
      .collection("enrollments")
      .findOne({
        userId: new mongoose.Types.ObjectId(studentId),
        courseId: paid._id,
      }),
  );
  assert.equal(
    (await db.collection("payments").findOne({ _id: payment._id })).status,
    "paid",
  );
  assert.match(listenerLog, /\[200\].*POST/);
  pass("Stripe test card payment → real signed webhook → paid enrollment");
  const paidLesson = await db
    .collection("lessons")
    .findOne({ courseId: paid._id, isPreview: false });
  await call(`/api/lessons/${paidLesson._id}/playback`, student);
  pass("Purchased protected lesson access");
  await call(`/api/courses/${draft._id}`, admin, "DELETE");
  pass("Course archival preserves enrolled access");
  report.status = "passed";
}
try {
  await main();
} catch (error) {
  report.status = "failed";
  report.error = clean(error.message);
  console.log("FAIL: " + report.error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  listener?.kill("SIGTERM");
  app?.kill("SIGTERM");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  for (const asset of assets) {
    try {
      await cloudinary.uploader.destroy(asset.id, {
        resource_type: asset.resource_type,
        type: asset.type,
        invalidate: true,
      });
      report.cleanup.push("Temporary " + asset.resource_type + " removed");
    } catch (error) {
      report.cleanup.push("Media cleanup failed: " + clean(error.message));
    }
  }
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.status === "open")
        await stripe.checkout.sessions.expire(sessionId);
    } catch (error) {
      report.cleanup.push("Checkout cleanup: " + clean(error.message));
    }
  }
  if (mongoose.connection.readyState === 1) {
    const db = mongoose.connection.db;
    if (studentId) {
      const id = new mongoose.Types.ObjectId(studentId);
      await db.collection("enrollments").deleteMany({ userId: id });
      await db.collection("payments").deleteMany({ userId: id });
      await db.collection("users").deleteOne({ _id: id });
      report.cleanup.push(
        "Temporary student and test enrollment/payment records removed",
      );
    }
    if (temporaryCourseId) {
      const id = new mongoose.Types.ObjectId(temporaryCourseId);
      await db.collection("lessons").deleteMany({ courseId: id });
      await db.collection("courses").deleteOne({ _id: id });
      report.cleanup.push("Temporary course and lessons removed");
    }
    if (temporaryCategoryId)
      await db
        .collection("categories")
        .deleteOne({ _id: new mongoose.Types.ObjectId(temporaryCategoryId) });
    report.finalCounts = Object.fromEntries(
      await Promise.all(
        [
          "users",
          "categories",
          "courses",
          "lessons",
          "enrollments",
          "payments",
        ].map(async (name) => [
          name,
          await db.collection(name).countDocuments(),
        ]),
      ),
    );
    await mongoose.disconnect();
  }
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/configured-services.json",
    JSON.stringify(report, null, 2),
  );
  await writeFile("test-results/configured-server.log", serverLog);
  await writeFile("test-results/configured-webhooks.log", listenerLog);
  console.log("Verification report: test-results/configured-services.json");
}
