import "server-only";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { User } from "@/models";
import { db } from "./db";
import { loginSchema } from "./validations";
import { ApiError } from "./http";
import { rateLimit } from "./rate-limit";
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        await rateLimit(`login:${parsed.data.email}`, 15);
        await db();
        const user = await User.findOne({ email: parsed.data.email }).select(
          "+password",
        );
        // A real bcrypt hash keeps unknown-account checks comparable in cost.
        const valid = await compare(
          parsed.data.password,
          user?.password ??
            "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
        );
        if (!user || !valid || !user.active) return null;
        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role as "student" | "admin",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role ?? "student";
      }
      return session;
    },
  },
};
export async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  await db();
  return User.findOne({ _id: session.user.id, active: true });
}
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "Please sign in to continue");
  if (admin && user.role !== "admin")
    throw new ApiError(403, "Administrator access required");
  return user;
}
export async function pageUser(admin = false) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (admin && user.role !== "admin") redirect("/dashboard");
  return user;
}
