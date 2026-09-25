import { pageUser } from "@/lib/auth";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await pageUser();
  return children;
}
