import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { catalogQueryOptions } from "@/lib/catalog.functions";
import { formatVnd } from "@/lib/brand";

export const Route = createFileRoute("/bang-gia")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  head: () => ({
    meta: [
      { title: "Bảng giá in ảnh — Nhà In Thiên Thiên" },
      {
        name: "description",
        content:
          "Bảng giá in ảnh gỗ lụa, tráng gương, ảnh thẻ, album và phục hồi ảnh cũ. Giá xưởng, minh bạch từng quy cách.",
      },
      { property: "og:title", content: "Bảng giá in ảnh — Nhà In Thiên Thiên" },
      { property: "og:description", content: "Giá xưởng cho mọi nhà, minh bạch từng kích thước." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { data: products } = useSuspenseQuery(catalogQueryOptions);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <h1 className="text-3xl font-extrabold text-primary md:text-4xl">Bảng giá</h1>
        <p className="mt-2 text-muted-foreground">
          Giá đã bao gồm in và hoàn thiện. Đơn số lượng lớn vui lòng nhắn Zalo để nhận giá tốt hơn.
        </p>

        <div className="mt-8 space-y-6">
          {products.map((product) => (
            <section key={product.id} className="glass-card rounded-3xl p-5 md:p-6">
              <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
              <p className="text-sm text-muted-foreground">
                {product.description} • {product.turnaround_text}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {product.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-3"
                  >
                    <span className="text-sm font-medium">{variant.name}</span>
                    <span className="text-sm font-bold text-primary">
                      {variant.requires_quote || variant.price === null
                        ? "Liên hệ"
                        : formatVnd(variant.sale_price ?? variant.price)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
