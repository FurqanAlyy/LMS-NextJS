import { requireUser } from "@/lib/auth";
import { adminUsers } from "@/lib/admin";
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
  return json(await adminUsers(page));
});
