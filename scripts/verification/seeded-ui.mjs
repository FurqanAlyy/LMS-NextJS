/** Read-only browser verification of the actual seeded catalog and preview media. */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const base = "http://127.0.0.1:32191";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let app, browser;
let log = "";
const report = { checks: [] };
try {
  app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "32191",
    ],
    {
      env: { ...process.env, NEXTAUTH_URL: base },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  app.stdout.on("data", (d) => {
    log += d.toString();
  });
  app.stderr.on("data", (d) => {
    log += d.toString();
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
  assert.ok(ready, "Server did not start");
  browser = await chromium.launch({
    headless: true,
    ...(existsSync("/usr/bin/google-chrome")
      ? { executablePath: "/usr/bin/google-chrome" }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(base + "/courses");
  await page.getByRole("heading", { name: "Find your next skill." }).waitFor();
  const images = page.locator("img:visible");
  assert.equal(await images.count(), 4);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(async (image) => {
      if (!image.complete)
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () =>
            reject(new Error("Seed thumbnail failed to load"));
        });
      if (image.naturalWidth === 0)
        throw new Error("Seed thumbnail has no decoded pixels");
    });
  }
  report.checks.push(
    "All four actual Cloudinary seed thumbnails decode through Next.js Image",
  );
  console.log("PASS: Four seeded course thumbnails load and decode");
  await page.screenshot({
    path: "test-results/learnx-catalog-desktop.png",
    fullPage: true,
  });
  await page.goto(base);
  await page.getByRole("heading", { name: /Make room for/ }).waitFor();
  for (const img of await page.locator("img:visible").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((image) => image.decode());
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/learnx-seeded-home.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/courses");
  await page.getByRole("heading", { name: "Find your next skill." }).waitFor();
  for (const img of await page.locator("img:visible").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((image) => image.decode());
  }
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/learnx-catalog-mobile.png",
    fullPage: true,
  });
  report.checks.push("Actual seeded catalog fits mobile viewport");
  console.log("PASS: Seeded catalog works on mobile");
  const catalog = await (await fetch(base + "/api/courses")).json();
  const course = catalog.courses.find((c) => c.price > 0);
  const details = await (
    await fetch(`${base}/api/courses/${course._id}`)
  ).json();
  const preview = details.lessons.find((l) => l.isPreview);
  const protectedLesson = details.lessons.find((l) => !l.isPreview);
  assert.equal(
    (await fetch(`${base}/api/lessons/${protectedLesson._id}/playback`)).status,
    401,
  );
  await page.goto(`${base}/learn/${course._id}/${preview._id}`);
  await page.waitForFunction(
    () => (document.querySelector("video")?.readyState ?? 0) >= 2,
    {},
    { timeout: 60000 },
  );
  await page.locator("video:visible").evaluate((video) => {
    video.muted = true;
    return video.play();
  });
  await page.waitForFunction(
    () => (document.querySelector("video")?.currentTime ?? 0) > 0.1,
  );
  await page.locator("video:visible").evaluate((video) => video.pause());
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  report.checks.push(
    "Seed preview plays on mobile; non-preview denied without enrollment",
  );
  console.log(
    "PASS: Real seed preview playback and protected-lesson access control",
  );
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error.message;
  console.log("FAIL: " + error.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  app?.kill("SIGTERM");
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/seeded-ui.json",
    JSON.stringify(report, null, 2),
  );
  await writeFile("test-results/seeded-ui-server.log", log);
}
