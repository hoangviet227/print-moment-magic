import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { adminOrdersQueryOptions, STATUS_LABEL, type OrderStatus } from "@/lib/admin.functions";
import { formatVnd } from "@/lib/brand";

export const Route = createFileRoute("/admin/don-hang/")({
  component: AdminOrders,
});

const FILTERS: ("all" | OrderStatus)[] = [
  "all",
  "pending_review",
  "confirmed",
  "processing",
  "producing",
  "ready",
  "completed",
  "cancelled",
];

function AdminOrders() {
  const { data, isLoading, error } = useQuery(adminOrdersQueryOptions);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [term, setTerm] = useState("");

  const orders = (data?.orders ?? []).filter((o) => {
    const matchStatus = filter === "all" || o.status === filter;
    const q = term.trim().toLowerCase();
    const matchTerm =
      !q ||
      o.code.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.phone.includes(q);
    return matchStatus && matchTerm;
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-primary">Đơn hàng</h1>

      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Tìm theo mã đơn, tên hoặc số điện thoại"
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-card text-foreground/75"
            }`}
          >
            {f === "all" ? "Tất cả" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-muted-foreground">Đang tải…</p> : null}
      {error ? <p className="text-destructive">{(error as Error).message}</p> : null}

      <div className="space-y-3">
        {orders.map((o) => (
          <Link
            key={o.id}
            to="/admin/don-hang/$code"
            params={{ code: o.code }}
            className="glass-card block rounded-3xl p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-extrabold text-primary">{o.code}</span>
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
                {STATUS_LABEL[o.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {o.customerName} · {o.phone} · {o.fileCount} ảnh ·{" "}
              {o.fulfillment === "pickup" ? "Nhận tại xưởng" : "Giao tận nơi"}
            </p>
            <p className="mt-2 font-bold">{formatVnd(o.total)}</p>
          </Link>
        ))}
        {!isLoading && orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có đơn nào phù hợp.</p>
        ) : null}
      </div>
    </div>
  );
}
