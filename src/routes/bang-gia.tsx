import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import {
  catalogQueryOptions,
  type CatalogProduct,
  type CatalogVariant,
} from "@/lib/catalog.functions";
import { formatVnd } from "@/lib/brand";
import { productImage } from "@/lib/product-images";

export const Route = createFileRoute("/bang-gia")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  head: () => ({
    meta: [
      { title: "Bảng giá & đặt mua in ảnh — Nhà In Thiên Thiên" },
      {
        name: "description",
        content:
          "Xem ảnh mẫu, chọn kích thước và số lượng rồi đặt mua ngay: ảnh gỗ lụa, tráng gương, ảnh thẻ, album và phục hồi ảnh cũ với giá xưởng.",
      },
      { property: "og:title", content: "Bảng giá & đặt mua in ảnh — Nhà In Thiên Thiên" },
      {
        property: "og:description",
        content: "Chọn size, chọn số lượng, đặt mua trong vài giây. Giá xưởng cho mọi nhà.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function variantPrice(v: CatalogVariant): number | null {
  if (v.requires_quote) return null;
  return v.sale_price ?? v.price;
}

function PricingPage() {
  const { data: products } = useSuspenseQuery(catalogQueryOptions);
  const navigate = useNavigate();

  const [cart, setCart] = useState<Record<string, number>>({});

  const lookup = useMemo(() => {
    const map = new Map<string, { product: CatalogProduct; variant: CatalogVariant }>();
    for (const product of products)
      for (const variant of product.variants) map.set(variant.id, { product, variant });
    return map;
  }, [products]);

  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ id, qty, ...lookup.get(id)! }))
    .filter((l) => l.variant);

  const total = lines.reduce((sum, l) => sum + (variantPrice(l.variant) ?? 0) * l.qty, 0);
  const hasQuote = lines.some((l) => variantPrice(l.variant) === null);

  function addToCart(variantId: string, qty: number, label: string) {
    setCart((prev) => ({ ...prev, [variantId]: (prev[variantId] ?? 0) + qty }));
    toast.success(`Đã thêm ${qty} × ${label} vào đơn`);
  }

  function checkout() {
    const items = lines.map((l) => `${l.id}:${l.qty}`).join(",");
    navigate({ to: "/dat-in", search: { items } });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-40 md:px-6">
        <h1 className="text-3xl font-extrabold text-primary md:text-4xl">Bảng giá & đặt mua</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Xem ảnh mẫu, chọn kích thước và số lượng, rồi bấm đặt mua. Bước cuối bạn chỉ cần gửi ảnh
          gốc và thông tin nhận hàng.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={addToCart} />
          ))}
        </div>
      </main>

      {lines.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="max-h-28 overflow-auto text-sm">
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-2 py-0.5">
                  <span className="flex-1 truncate text-foreground/80">
                    {l.product.name} — {l.variant.name} × {l.qty}
                  </span>
                  <span className="font-semibold text-primary">
                    {variantPrice(l.variant) === null
                      ? "Liên hệ"
                      : formatVnd(variantPrice(l.variant)! * l.qty)}
                  </span>
                  <button
                    type="button"
                    aria-label="Xoá dòng"
                    className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                    onClick={() => setCart((prev) => ({ ...prev, [l.id]: 0 }))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 md:justify-end">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Tạm tính</p>
                <p className="text-lg font-extrabold text-primary">
                  {formatVnd(total)}
                  {hasQuote ? " + báo giá" : ""}
                </p>
              </div>
              <Button size="lg" className="min-h-11" onClick={checkout}>
                <ShoppingBag className="size-4" /> Đặt mua
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <SiteFooter />
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: CatalogProduct;
  onAdd: (variantId: string, qty: number, label: string) => void;
}) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const price = variant ? variantPrice(variant) : null;
  const image = productImage(product.slug);

  return (
    <article className="glass-card overflow-hidden rounded-3xl">
      <img
        src={image}
        alt={`Ảnh mẫu ${product.name}`}
        loading="lazy"
        width={800}
        height={600}
        className="h-52 w-full object-cover md:h-60"
      />
      <div className="p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {product.category}
        </p>
        <h2 className="mt-1 text-xl font-bold text-foreground">{product.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {product.description} • {product.turnaround_text}
        </p>

        <p className="mt-5 text-sm font-semibold text-foreground">Chọn kích thước</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.variants.map((v) => {
            const active = v.id === variant?.id;
            const p = variantPrice(v);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card/70 text-foreground/80 hover:border-primary/50"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {active ? <Check className="size-3.5" /> : null}
                  {v.name}
                </span>
                <span className="block text-xs font-semibold text-accent">
                  {p === null ? "Liên hệ" : formatVnd(p)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Số lượng</span>
            <div className="flex items-center rounded-full border border-border bg-card/70">
              <button
                type="button"
                aria-label="Giảm"
                className="grid size-10 place-items-center text-muted-foreground"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{qty}</span>
              <button
                type="button"
                aria-label="Tăng"
                className="grid size-10 place-items-center text-muted-foreground"
                onClick={() => setQty((q) => Math.min(500, q + 1))}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Thành tiền</p>
            <p className="text-lg font-extrabold text-primary">
              {price === null ? "Liên hệ" : formatVnd(price * qty)}
            </p>
          </div>
        </div>

        <Button
          className="mt-4 min-h-11 w-full"
          disabled={!variant}
          onClick={() =>
            variant && onAdd(variant.id, qty, `${product.name} — ${variant.name}`)
          }
        >
          <ShoppingBag className="size-4" /> Thêm vào đơn
        </Button>
      </div>
    </article>
  );
}
