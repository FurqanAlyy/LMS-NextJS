import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "./http";
export function cloud() {
  const {
    CLOUDINARY_CLOUD_NAME: cloud_name,
    CLOUDINARY_API_KEY: api_key,
    CLOUDINARY_API_SECRET: api_secret,
  } = process.env;
  if (!cloud_name || !api_key || !api_secret)
    throw new ApiError(503, "Media service is not configured");
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return cloudinary;
}
export async function verifyVideo(publicId: string) {
  if (!/^lms\/videos\/[a-zA-Z0-9/_-]+$/.test(publicId))
    throw new ApiError(400, "Invalid video");
  const asset = await cloud().api.resource(publicId, {
    resource_type: "video",
    type: "authenticated",
    media_metadata: true,
  });
  if (
    asset.bytes > 100 * 1024 * 1024 ||
    !["mp4", "webm", "mov"].includes(asset.format)
  )
    throw new ApiError(400, "Video must be MP4, WebM, or MOV and under 100 MB");
  if (
    typeof asset.duration !== "number" ||
    !Number.isFinite(asset.duration) ||
    asset.duration <= 0
  ) {
    throw new ApiError(
      422,
      "Video metadata is not ready. Wait a moment and save the lesson again.",
    );
  }
  return {
    videoPublicId: publicId,
    videoUrl: asset.secure_url as string,
    videoFormat: asset.format as string,
    duration: Math.round(asset.duration as number),
  };
}
export function playbackUrl(publicId: string, format: string) {
  return cloud().utils.private_download_url(publicId, format, {
    resource_type: "video",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    attachment: false,
  });
}
