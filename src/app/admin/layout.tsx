import { pageUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
export const metadata = { title: "Admin workspace" };
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await pageUser(true);
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-[1600px] flex-col lg:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">{children}</div>
    </div>
  );
}
