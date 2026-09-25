import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { idSchema } from "./validations";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export function api<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError)
        return json({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return json(
          {
            error: error.issues[0]?.message ?? "Invalid request",
            issues: error.flatten(),
          },
          400,
        );
      if (error instanceof SyntaxError)
        return json({ error: "Invalid JSON body" }, 400);
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === 11000
      )
        return json(
          { error: "This record already exists. Refresh and try again." },
          409,
        );
      console.error(
        "Request failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}
export async function body<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  const origin = request.headers.get("origin");
  const expected = process.env.NEXTAUTH_URL;
  if (origin && expected && origin !== new URL(expected).origin)
    throw new ApiError(403, "Invalid request origin");
  const text = await request.text();
  if (text.length > 50000) throw new ApiError(413, "Request is too large");
  return schema.parse(JSON.parse(text));
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    process.env.NEXTAUTH_URL &&
    origin !== new URL(process.env.NEXTAUTH_URL).origin
  )
    throw new ApiError(403, "Invalid request origin");
}
export type IdContext = { params: Promise<{ id: string }> };
export async function routeId(ctx: IdContext) {
  return idSchema.parse((await ctx.params).id);
}
