import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { adminOrdersQueryOptions, STATUS_LABEL } from "@/lib/admin.functions";
import { formatVnd } from "@/lib/brand";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading, error } = useQuery(adminOrdersQueryOptions);
  const orders = data?.orders ?? [];

  const pending = orders.filter((o) => o.status === "pending_review").length;
  const producing = orders.filter((o) => ["confirmed", "processing", "producing"].includes(o.status))
    .length;
  const revenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0);

  if (isLoading) return <p className="text-muted-foreground">Đang tải dữ liệu…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-primary">Tổng quan</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Đơn chờ duyệt", value: String(pending) },
          { label: "Đang sản xuất", value: String(producing) },
          { label: "Doanh thu hoàn tất", value: formatVnd(revenue) },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-3xl p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-bold text-foreground">Đơn mới nhất</h2>
        <div className="mt-4 space-y-3">
          {orders.slice(0, 8).map((o) => (
            <Link
              key={o.id}
              to="/admin/don-hang/$code"
              params={{ code: o.code }}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card px-4 py-3"
            >
              <span className="font-bold text-primary">{o.code}</span>
              <span className="text-sm text-muted-foreground">{o.customerName}</span>
              <span className="text-xs font-semibold text-accent">{STATUS_LABEL[o.status]}</span>
              <span className="text-sm font-bold">{formatVnd(o.total)}</span>
            </Link>
          ))}
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đơn hàng nào.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
