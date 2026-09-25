"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { loginSchema, registerSchema } from "@/lib/validations";
import { safeCallback } from "@/lib/utils";
import { request } from "@/lib/client";
const formSchema = loginSchema.extend({ name: z.string().optional() });
type Fields = z.infer<typeof formSchema>;
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const router = useRouter();
  const params = useSearchParams();
  const form = useForm<Fields>({
    resolver: zodResolver(registering ? registerSchema : formSchema),
    defaultValues: {
      email: "",
      password: "",
      ...(registering ? { name: "" } : {}),
    },
  });
  async function submit(values: Fields) {
    try {
      if (registering)
        await request("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(values),
        });
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (result?.error)
        throw new Error(
          "Unable to sign in. Check your credentials or try again later.",
        );
      toast.success(registering ? "Welcome to LearnX!" : "Welcome back!");
      router.push(safeCallback(params.get("callbackUrl")));
      router.refresh();
    } catch (error) {
      form.setError("root", { message: (error as Error).message });
    }
  }
  return (
    <div className="mx-auto grid min-h-[75vh] max-w-5xl items-center gap-12 px-5 py-14 md:grid-cols-2">
      <div className="hidden md:block">
        <div className="mb-8 flex size-16 items-center justify-center rounded-2xl bg-mint text-brand">
          <BookOpen size={30} />
        </div>
        <p className="eyebrow mb-4">A LITTLE PROGRESS. EVERY WEEKEND.</p>
        <h1 className="text-5xl font-semibold leading-tight">
          Your next chapter
          <br />
          starts{" "}
          <span className="font-serif font-normal italic text-brand">
            with you.
          </span>
        </h1>
        <p className="mt-6 max-w-sm leading-7 text-muted">
          Practical skills, one lesson at a time. Make space for the things
          you’ve always wanted to learn.
        </p>
      </div>
      <div className="card p-7 sm:p-10">
        <h2 className="text-3xl font-semibold">
          {registering ? "Start your journey" : "Welcome back"}
        </h2>
        <p className="mb-8 mt-3 text-sm text-muted">
          {registering
            ? "Create your free account. Find your next skill."
            : "A little closer to where you want to be."}
        </p>
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="space-y-5"
        >
          {registering && (
            <label className="field">
              Full name
              <input autoComplete="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <span className="field-error">
                  {form.formState.errors.name.message}
                </span>
              )}
            </label>
          )}
          <label className="field">
            Email address
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <span className="field-error">
                {form.formState.errors.email.message}
              </span>
            )}
          </label>
          <label className="field">
            Password
            <input
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              {...form.register("password")}
            />
            {registering && (
              <span className="text-xs text-muted">
                At least 10 characters; maximum 72 bytes.
              </span>
            )}
            {form.formState.errors.password && (
              <span className="field-error">
                {form.formState.errors.password.message}
              </span>
            )}
          </label>
          {form.formState.errors.root && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {form.formState.errors.root.message}
            </p>
          )}
          <button disabled={form.formState.isSubmitting} className="btn w-full">
            {form.formState.isSubmitting ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <ArrowRight size={17} />
            )}
            {registering ? "Create account" : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {registering ? "Already learning with us?" : "New around here?"}{" "}
          <Link
            href={`/${registering ? "login" : "register"}${params.get("callbackUrl") ? `?callbackUrl=${encodeURIComponent(safeCallback(params.get("callbackUrl")))}` : ""}`}
            className="font-semibold text-brand"
          >
            {registering ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
