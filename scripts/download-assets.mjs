import { mkdir, access, rename } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const destination = fileURLToPath(new URL("../seed-assets/", import.meta.url));
const assets = [
  [
    "web-development.jpg",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85",
  ],
  [
    "design.jpg",
    "https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1200&q=85",
  ],
  [
    "javascript.jpg",
    "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=85",
  ],
  [
    "workspace.jpg",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85",
  ],
  [
    "sample-lesson.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  ],
];
await mkdir(destination, { recursive: true });
for (const [name, url] of assets) {
  const path = `${destination}/${name}`;
  try {
    await access(path);
    console.log(`Already downloaded: ${name}`);
    continue;
  } catch {}
  execFileSync(
    "curl",
    [
      "--fail",
      "--location",
      "--retry",
      "2",
      "--connect-timeout",
      "20",
      "--max-time",
      "120",
      "--output",
      `${path}.part`,
      url,
    ],
    { stdio: "inherit" },
  );
  await rename(`${path}.part`, path);
  console.log(`Downloaded ${name}`);
}
