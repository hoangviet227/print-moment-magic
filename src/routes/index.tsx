import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, Clock, MessageCircle, ShieldCheck, Sparkles, Truck } from "lucide-react";

import { BRAND_COVER } from "@/lib/assets";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { catalogQueryOptions, minPrice } from "@/lib/catalog.functions";
import { BRAND, formatVnd } from "@/lib/brand";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  head: () => ({
    meta: [
      { title: "Nhà In Thiên Thiên — In ảnh giá xưởng, gửi ảnh online" },
      {
        name: "description",
        content:
          "In ảnh gỗ lụa, tráng gương, ảnh thẻ, phục hồi ảnh cũ tại Xuân Lộc, Đồng Nai. Gửi ảnh online 3 bước, nhận mã đơn và theo dõi tiến trình.",
      },
      { property: "og:title", content: "Nhà In Thiên Thiên — In đẹp từng khoảnh khắc" },
      {
        property: "og:description",
        content: "Gửi ảnh online, in đẹp giá xưởng, giao tận nơi hoặc nhận tại xưởng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  { icon: Camera, title: "Chọn sản phẩm", desc: "Chọn quy cách, kích thước và số lượng cần in." },
  { icon: Sparkles, title: "Gửi ảnh gốc", desc: "Tải ảnh chất lượng cao ngay trên trình duyệt." },
  { icon: Clock, title: "Nhận mã đơn", desc: "Theo dõi tiến trình và nhận hàng tận nơi." },
];

const BENEFITS = [
  { icon: ShieldCheck, title: "Giá xưởng", desc: "Bảng giá công khai, không phát sinh." },
  { icon: Clock, title: "Trả nhanh 24–48h", desc: "Đơn gấp hỗ trợ ưu tiên trong ngày." },
  { icon: Truck, title: "Giao tận nơi", desc: "Nhận tại xưởng hoặc giao toàn quốc." },
];

function HomePage() {
  const { data: products } = useSuspenseQuery(catalogQueryOptions);
  const featured = products.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:px-6 md:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">
              <Sparkles className="size-3.5" /> {BRAND.message}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              {BRAND.slogan}
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Gửi ảnh online chỉ với 3 bước — Nhà In Thiên Thiên in ảnh gỗ lụa, tráng gương, ảnh thẻ
              và phục hồi ảnh cũ với chất lượng xưởng tại {BRAND.region}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/dat-in">
                  Gửi ảnh đặt in <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/bang-gia">Xem bảng giá</Link>
              </Button>
            </div>
            <a
              href={BRAND.zalo}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <MessageCircle className="size-4 text-accent" /> Zalo tư vấn {BRAND.phone}
            </a>
          </div>
          <div className="glass-card overflow-hidden rounded-3xl p-3">
            <img
              src={BRAND_COVER}
              alt="Ảnh in mẫu của Nhà In Thiên Thiên"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="glass-card rounded-3xl p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="size-5" />
                  </span>
                  <span className="text-xs font-bold uppercase text-accent">Bước {i + 1}</span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-foreground">{step.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-extrabold text-primary md:text-3xl">Sản phẩm nổi bật</h2>
            <Link to="/san-pham" className="text-sm font-semibold text-accent">
              Xem tất cả
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <article key={product.id} className="glass-card rounded-3xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {product.category}
                </p>
                <h3 className="mt-1 text-xl font-bold text-foreground">{product.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {product.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
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
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="glass-panel rounded-3xl p-5">
                <b.icon className="size-6 text-accent" />
                <h3 className="mt-3 text-lg font-bold text-foreground">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
