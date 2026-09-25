import { Category } from "@/models";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { api, body, json } from "@/lib/http";
import { categorySchema } from "@/lib/validations";
export const GET = api(async () => {
  await db();
  return json(await Category.find().sort({ name: 1 }).lean());
});
export const POST = api(async (request: Request) => {
  await requireUser(true);
  return json(await Category.create(await body(request, categorySchema)), 201);
});
