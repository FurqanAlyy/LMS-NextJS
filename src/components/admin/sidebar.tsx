"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LibraryBig,
  Tags,
  Users,
  GraduationCap,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: LibraryBig },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/enrollments", label: "Enrollments", icon: GraduationCap },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
];
export function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="border-b border-slate-200 bg-white lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="p-5 lg:sticky lg:top-20">
        <p className="eyebrow mb-5">WORKSPACE / ADMIN</p>
        <nav
          aria-label="Admin navigation"
          className="flex gap-1 overflow-x-auto lg:flex-col"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${path === l.href || (l.href !== "/admin" && path.startsWith(l.href)) ? "bg-mint text-brand" : "text-muted hover:bg-slate-50"}`}
            >
              <l.icon size={18} />
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/courses"
          className="btn-ghost mt-8 hidden w-full justify-between lg:flex"
        >
          View catalog <ArrowUpRight size={16} />
        </Link>
      </div>
    </aside>
  );
}
