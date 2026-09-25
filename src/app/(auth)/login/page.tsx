import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Log in" };
export default function Login() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
