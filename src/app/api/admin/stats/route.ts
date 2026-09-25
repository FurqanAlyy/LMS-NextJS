import { requireUser } from "@/lib/auth";
import { adminStats } from "@/lib/admin";
import { api, json } from "@/lib/http";
export const GET = api(async () => {
  await requireUser(true);
  return json(await adminStats());
});
