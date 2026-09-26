"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ArrowUpRight, BookOpen, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  async function logout() {
    setSigningOut(true);
    try {
      await signOut({ redirect: false, callbackUrl: "/" });
      // Keep the browser on its current origin, including local preview ports.
      // A full reload also discards cached pages from the authenticated session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch {
      toast.error("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-paper/95 backdrop-blur">
      <nav
        className="container-page flex h-20 items-center justify-between gap-5"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-ink text-white">
            <BookOpen size={19} />
          </span>
          <span className="text-lg">
            LearnX<span className="text-brand">.</span>
          </span>
          <span className="hidden border-l border-slate-300 pl-3 text-xs font-normal text-muted sm:block">
            LEARN
          </span>
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          <Link
            className={
              path.startsWith("/courses")
                ? "text-sm font-semibold text-brand"
                : "text-sm text-muted"
            }
            href="/courses"
          >
            Explore courses
          </Link>
          <Link className="text-sm text-muted" href="/dashboard">
            My learning
          </Link>
          {session?.user.role === "admin" && (
            <Link className="text-sm text-muted" href="/admin">
              Admin
            </Link>
          )}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-mint font-semibold text-brand">
                  {session.user.name?.charAt(0)}
                </span>
                {session.user.name?.split(" ")[0]}
              </Link>
              <button
                className="btn-ghost"
                aria-label="Sign out"
                disabled={signingOut}
                onClick={logout}
              >
                <LogOut size={17} />
              </button>
            </>
          ) : status === "loading" ? (
            <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <>
              <Link className="btn-ghost" href="/login">
                Log in
              </Link>
              <Link className="btn" href="/register">
                Start learning <ArrowUpRight size={16} />
              </Link>
            </>
          )}
        </div>
        <button
          className="btn-ghost md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <div className="container-page grid gap-2 pb-5 md:hidden">
          {[
            ["/courses", "Explore courses"],
            ["/dashboard", "My learning"],
            ...(session?.user.role === "admin" ? [["/admin", "Admin"]] : []),
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="btn-ghost justify-start"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          {session ? (
            <button
              className="btn-secondary"
              disabled={signingOut}
              onClick={logout}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          ) : (
            <Link href="/login" className="btn" onClick={() => setOpen(false)}>
              Log in / Join
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
