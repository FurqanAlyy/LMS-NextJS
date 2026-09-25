import { hash } from "bcryptjs";
import { User } from "@/models";
import { db } from "@/lib/db";
import { api, body, json, ApiError } from "@/lib/http";
import { registerSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
export const POST = api(async (request: Request) => {
  const data = await body(request, registerSchema);
  await rateLimit(`register:${data.email}`, 5, 3600);
  await db();
  if (await User.exists({ email: data.email }))
    throw new ApiError(409, "An account with this email already exists");
  await User.create({
    ...data,
    password: await hash(data.password, 12),
    role: "student",
  });
  return json({ message: "Account created. You can now sign in." }, 201);
});
