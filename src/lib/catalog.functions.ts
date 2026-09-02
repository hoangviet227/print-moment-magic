import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";

import type { Database } from "@/integrations/supabase/types";

export type CatalogVariant = {
  id: string;
  name: string;
  width: number | null;
  height: number | null;
  unit: string;
  price: number | null;
  sale_price: number | null;
  requires_quote: boolean;
  recommended_width_px: number | null;
  recommended_height_px: number | null;
  sort_order: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  cover_path: string | null;
  turnaround_text: string;
  sort_order: number;
  variants: CatalogVariant[];
};

export const getCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogProduct[]> => {
    const supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,slug,category,description,cover_path,turnaround_text,sort_order,product_variants(id,name,width,height,unit,price,sale_price,requires_quote,recommended_width_px,recommended_height_px,sort_order,is_active)",
      )
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      description: p.description,
      cover_path: p.cover_path,
      turnaround_text: p.turnaround_text,
      sort_order: p.sort_order,
      variants: (p.product_variants ?? [])
        .filter((v) => v.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(({ is_active: _ignored, ...v }) => ({
          ...v,
          width: v.width === null ? null : Number(v.width),
          height: v.height === null ? null : Number(v.height),
        })),
    }));
  },
);

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
});

export function minPrice(product: CatalogProduct): number | null {
  const prices = product.variants
    .map((v) => v.sale_price ?? v.price)
    .filter((p): p is number => typeof p === "number");
  return prices.length ? Math.min(...prices) : null;
}
