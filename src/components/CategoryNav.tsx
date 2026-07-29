import Link from "next/link";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["categories"]["Row"];

const baseClass = "rounded-full px-4 py-1.5 text-sm font-medium transition-colors";
const activeClass = "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900";
const inactiveClass =
  "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800";

export default function CategoryNav({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug: string | null;
}) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <Link href="/" className={`${baseClass} ${!activeSlug ? activeClass : inactiveClass}`}>
        전체
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/?category=${category.slug}`}
          className={`${baseClass} ${
            activeSlug === category.slug ? activeClass : inactiveClass
          }`}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
