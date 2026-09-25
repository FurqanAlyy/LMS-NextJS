import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { api, body, json } from "@/lib/http";
import { cloud } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";
export const POST = api(async (request: Request) => {
  const user = await requireUser(true);
  await rateLimit(`upload:${user._id}`, 50, 3600);
  const { kind } = await body(
    request,
    z.object({ kind: z.enum(["image", "video"]) }).strict(),
  );
  const c = cloud();
  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    public_id: `lms/${kind === "video" ? "videos" : "images"}/${randomUUID()}`,
    type: kind === "video" ? "authenticated" : "upload",
    overwrite: false,
    allowed_formats: kind === "video" ? "mp4,webm,mov" : "jpg,jpeg,png,webp",
    transformation:
      kind === "image" ? "c_limit,w_1600,h_1000" : "f_mp4,vc_h264,ac_aac",
  };
  return json({
    params,
    signature: c.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET!,
    ),
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    resourceType: kind,
  });
});
