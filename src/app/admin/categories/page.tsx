import { Category } from "@/models";
import { pageUser } from "@/lib/auth";
import { serialize } from "@/lib/utils";
import type { CategoryData } from "@/types";
import { AdminHeader } from "@/components/admin/header";
import { CategoryManager } from "@/components/admin/category-manager";
export default async function Categories() {
  await pageUser(true);
  const categories = serialize<CategoryData[]>(
    await Category.find().sort({ name: 1 }).lean(),
  );
  return (
    <>
      <AdminHeader
        title="Categories"
        description="Give every course a place to belong."
      />
      <CategoryManager categories={categories} />
    </>
  );
}
