import { Payment } from "@/models";
import { requireUser } from "@/lib/auth";
import { api, json } from "@/lib/http";
export const GET = api(async (request: Request) => {
  await requireUser(true);
  const page = Math.max(
    1,
    Math.min(
      10000,
      Math.floor(Number(new URL(request.url).searchParams.get("page"))) || 1,
    ),
  );
  return json(
    await Payment.find()
      .populate("userId", "name email")
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .skip((page - 1) * 25)
      .limit(25)
      .lean(),
  );
});
