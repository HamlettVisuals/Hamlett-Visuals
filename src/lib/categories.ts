import categoriesData from "@/content/categories.json";

export type Category = {
  slug: string;
  folderName: string;
  name: string;
  blurb: string;
  image: string;
  heroImage: string;
  heroAlt: string;
  order: number;
  published: boolean;
};

const categories = categoriesData as Category[];

export function getCategories(): Category[] {
  return categories
    .filter((category) => category.published)
    .sort((a, b) => a.order - b.order);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return getCategories().find((category) => category.slug === slug);
}
