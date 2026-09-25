import { z } from "zod";
import { User } from "@/models";
import { requireUser } from "@/lib/auth";
import { api, body, json, routeId, ApiError, type IdContext } from "@/lib/http";
export const PATCH = api(async (request: Request, ctx: IdContext) => {
  await requireUser(true);
  const id = await routeId(ctx);
  const data = await body(request, z.object({ active: z.boolean() }).strict());
  const user = await User.findOneAndUpdate({ _id: id, role: "student" }, data, {
    returnDocument: "after",
  });
  if (!user) throw new ApiError(403, "Admin accounts cannot be changed here");
  return json({
    message: data.active ? "Account activated" : "Account suspended",
  });
});
