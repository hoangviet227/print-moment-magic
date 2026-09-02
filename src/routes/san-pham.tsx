import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { catalogQueryOptions, minPrice } from "@/lib/catalog.functions";
import { formatVnd } from "@/lib/brand";

export const Route = createFileRoute("/san-pham")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  head: () => ({
    meta: [
      { title: "Sản phẩm in ảnh — Nhà In Thiên Thiên" },
      {
        name: "description",
        content:
          "Danh mục in ảnh gỗ lụa, tráng gương, ảnh thẻ, phục hồi ảnh cũ, ảnh nam châm và album với giá xưởng.",
      },
      { property: "og:title", content: "Sản phẩm in ảnh — Nhà In Thiên Thiên" },
      {
        property: "og:description",
        content: "Xem đầy đủ quy cách và giá in ảnh tại Nhà In Thiên Thiên.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data: products } = useSuspenseQuery(catalogQueryOptions);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h1 className="text-3xl font-extrabold text-primary md:text-4xl">Tất cả sản phẩm</h1>
        <p className="mt-2 text-muted-foreground">
          Chọn sản phẩm, xem quy cách và giá, rồi gửi ảnh đặt in chỉ trong vài phút.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="glass-card rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {product.category}
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{product.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>

              <ul className="mt-4 space-y-1.5 text-sm">
                {product.variants.slice(0, 5).map((variant) => (
                  <li key={variant.id} className="flex justify-between gap-3">
                    <span className="text-foreground/80">{variant.name}</span>
                    <span className="font-semibold text-primary">
                      {variant.requires_quote || variant.price === null
                        ? "Liên hệ"
                        : formatVnd(variant.sale_price ?? variant.price)}
                    </span>
                  </li>
                ))}
                {product.variants.length > 5 ? (
                  <li className="text-xs text-muted-foreground">
                    và {product.variants.length - 5} quy cách khác
                  </li>
                ) : null}
              </ul>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Từ{" "}
                  <strong className="text-base text-accent">
                    {minPrice(product) === null ? "Liên hệ" : formatVnd(minPrice(product)!)}
                  </strong>
                </span>
                <Button asChild size="sm">
                  <Link to="/dat-in" search={{ product: product.slug }}>
                    Đặt in <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
