import { Category, Course } from "@/models";
import { requireUser } from "@/lib/auth";
import {
  api,
  body,
  json,
  routeId,
  sameOrigin,
  ApiError,
  type IdContext,
} from "@/lib/http";
import { categorySchema } from "@/lib/validations";
export const PATCH = api(async (request: Request, ctx: IdContext) => {
  await requireUser(true);
  const category = await Category.findByIdAndUpdate(
    await routeId(ctx),
    await body(request, categorySchema),
    { returnDocument: "after", runValidators: true },
  );
  if (!category) throw new ApiError(404, "Category not found");
  return json(category);
});
export const DELETE = api(async (request: Request, ctx: IdContext) => {
  sameOrigin(request);
  await requireUser(true);
  const id = await routeId(ctx);
  if (await Course.exists({ category: id }))
    throw new ApiError(
      409,
      "Reassign courses in this category before deleting it",
    );
  if (!(await Category.findByIdAndDelete(id)))
    throw new ApiError(404, "Category not found");
  return json({ message: "Category deleted" });
});
