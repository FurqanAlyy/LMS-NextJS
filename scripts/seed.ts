import { access } from "node:fs/promises";
import path from "node:path";
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../src/lib/db";
import {
  Category,
  Course,
  Enrollment,
  Lesson,
  Payment,
  User,
  RateLimit,
} from "../src/models";
import { registerSchema } from "../src/lib/validations";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const adminInput = registerSchema.parse({
    name: "LearnX Admin",
    email,
    password,
  });
  for (const key of [
    "DATABASE_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ]) {
    if (!process.env[key]) throw new Error(`${key} is required for seeding`);
  }
  const assets = path.resolve("seed-assets");
  for (const file of [
    "web-development.jpg",
    "design.jpg",
    "javascript.jpg",
    "workspace.jpg",
    "sample-lesson.mp4",
  ]) {
    await access(path.join(assets, file)).catch(() => {
      throw new Error(`Missing ${file}. Run npm run seed:assets first.`);
    });
  }
  await db();
  await Promise.all([
    User.init(),
    Category.init(),
    Course.init(),
    Lesson.init(),
    Enrollment.init(),
    Payment.init(),
    RateLimit.init(),
  ]);
  const existing = await User.findOne({ email: adminInput.email });
  if (existing && existing.role !== "admin")
    throw new Error(
      "Seed email belongs to a student. Choose a different SEED_ADMIN_EMAIL.",
    );
  if (!existing)
    await User.create({
      ...adminInput,
      password: await hash(adminInput.password, 12),
      role: "admin",
    });
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const categories = await Promise.all(
    [
      {
        name: "Web Development",
        slug: "web-development",
        description: "Build for the modern web.",
      },
      {
        name: "Design",
        slug: "design",
        description: "Create thoughtful digital experiences.",
      },
      {
        name: "Programming",
        slug: "programming",
        description: "Develop your programming foundations.",
      },
    ].map((c) =>
      Category.findOneAndUpdate(
        { slug: c.slug },
        { $setOnInsert: c },
        { upsert: true, returnDocument: "after" },
      ),
    ),
  );
  const video = await cloudinary.uploader.upload(
    path.join(assets, "sample-lesson.mp4"),
    {
      resource_type: "video",
      type: "authenticated",
      public_id: "lms/videos/seed/flower-demo",
      overwrite: false,
    },
  );
  const samples = [
    {
      title: "Build your first website",
      slug: "build-your-first-website",
      category: categories[0]._id,
      price: 0,
      level: "Beginner",
      image: "web-development.jpg",
      shortDescription:
        "Start with HTML and CSS, and turn a blank page into something of your own.",
      lessons: [
        "Welcome to the web",
        "Your first HTML page",
        "Styling with intention",
      ],
    },
    {
      title: "The thoughtful interface",
      slug: "the-thoughtful-interface",
      category: categories[1]._id,
      price: 29,
      level: "Beginner",
      image: "design.jpg",
      shortDescription:
        "Explore the foundations of clear, accessible, and beautiful digital design.",
      lessons: [
        "Design starts with people",
        "Space, hierarchy, and typography",
        "Making your first interface",
      ],
    },
    {
      title: "JavaScript, one concept at a time",
      slug: "javascript-one-concept-at-a-time",
      category: categories[2]._id,
      price: 39,
      level: "Intermediate",
      image: "javascript.jpg",
      shortDescription:
        "Make the language click through small ideas that build into real applications.",
      lessons: [
        "Thinking in JavaScript",
        "Functions and data",
        "Working with asynchronous code",
      ],
    },
    {
      title: "Full-stack systems with Next.js",
      slug: "full-stack-systems-with-nextjs",
      category: categories[0]._id,
      price: 59,
      level: "Advanced",
      image: "workspace.jpg",
      shortDescription:
        "Connect interfaces, databases, and authentication in a complete web application.",
      lessons: [
        "Planning a full-stack application",
        "Data and server boundaries",
        "Shipping with confidence",
      ],
    },
  ];
  for (const sample of samples) {
    const { image, lessons, ...data } = sample;
    const thumbnail = await cloudinary.uploader.upload(
      path.join(assets, image),
      {
        resource_type: "image",
        public_id: `lms/images/seed/${data.slug}`,
        overwrite: false,
      },
    );
    const course = await Course.findOneAndUpdate(
      { slug: data.slug },
      {
        $setOnInsert: {
          ...data,
          description: `${data.shortDescription}\n\nThis is a demonstration course for the LearnX LMS portfolio project. The included videos are short CC0 nature clips used to demonstrate video playback, previews, enrollment, and progress tracking. They are not instructional lessons. Replace them with original teaching material before a real launch.\n\nExplore the learning interface, mark lessons complete, and see your progress grow. Paid courses are intended for Stripe test mode.`,
          thumbnail: thumbnail.secure_url,
          instructor: "LearnX Studio",
          published: false,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    for (const [order, title] of lessons.entries())
      await Lesson.findOneAndUpdate(
        { courseId: course._id, title },
        {
          $setOnInsert: {
            courseId: course._id,
            title,
            description:
              "Demo lesson: this short CC0 nature clip demonstrates the video player. Replace it with instructional content before publishing to real learners.",
            videoUrl: video.secure_url,
            videoPublicId: video.public_id,
            videoFormat: video.format,
            duration: Math.round(video.duration),
            order,
            isPreview: order === 0,
          },
        },
        { upsert: true },
      );
    // Only publish newly seeded sample content; preserve subsequent administrator edits.
    if (course.createdAt.getTime() === course.updatedAt.getTime())
      await Course.updateOne({ _id: course._id }, { published: true });
    console.log(`Ready: ${data.title}`);
  }
  console.log(
    "Seed complete. Sign in with SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. Existing admin passwords are not reset.",
  );
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
