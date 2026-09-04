import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getOrderDetail,
  STATUS_LABEL,
  STATUS_OPTIONS,
  updateInternalNote,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/admin.functions";
import { formatVnd } from "@/lib/brand";

export const Route = createFileRoute("/admin/don-hang/$code")({
  component: AdminOrderDetail,
});

function AdminOrderDetail() {
  const { code } = Route.useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "order", code],
    queryFn: () => getOrderDetail({ data: { code } }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      updateOrderStatus({ data: { orderId: detailQuery.data!.id, status, note: "" } }),
    onSuccess: async () => {
      toast.success("Đã cập nhật trạng thái");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMutation = useMutation({
    mutationFn: (value: string) =>
      updateInternalNote({ data: { orderId: detailQuery.data!.id, note: value } }),
    onSuccess: () => toast.success("Đã lưu ghi chú nội bộ"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (detailQuery.isLoading) return <p className="text-muted-foreground">Đang tải đơn hàng…</p>;
  if (detailQuery.error)
    return <p className="text-destructive">{(detailQuery.error as Error).message}</p>;

  const order = detailQuery.data!;

  return (
    <div className="space-y-5">
      <Link to="/admin/don-hang" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft className="size-4" /> Về danh sách đơn
      </Link>

      <div className="glass-card rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-primary">{order.code}</h1>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent">
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {order.customerName} · {order.phone} ·{" "}
          {order.fulfillment === "pickup" ? "Nhận tại xưởng" : "Giao tận nơi"}
        </p>
        {order.address ? <p className="text-sm text-muted-foreground">{order.address}</p> : null}
        {order.customerNote ? (
          <p className="mt-2 rounded-2xl bg-card p-3 text-sm">Ghi chú khách: {order.customerNote}</p>
        ) : null}
      </div>

      <div className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-bold">Đổi trạng thái</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={statusMutation.isPending || s === order.status}
              onClick={() => statusMutation.mutate(s)}
              className={`min-h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${
                s === order.status ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-bold">Chi tiết đơn</h2>
        <div className="mt-3 space-y-2">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-sm">
              <span>
                {i.name} — {i.variant} × {i.quantity}
              </span>
              <span className="font-bold">{formatVnd(i.lineTotal)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-right text-lg font-extrabold text-primary">
          Tổng: {formatVnd(order.total)}
        </p>
      </div>

      <div className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-bold">Ảnh khách gửi ({order.files.length})</h2>
        <div className="mt-3 space-y-2">
          {order.files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(f.sizeBytes / 1024 / 1024).toFixed(1)} MB · {f.status}
                </p>
              </div>
              {f.url ? (
                <Button asChild size="sm" variant="outline">
                  <a href={f.url} target="_blank" rel="noreferrer">
                    <Download className="size-4" /> Tải
                  </a>
                </Button>
              ) : null}
            </div>
          ))}
          {order.files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
          ) : null}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-bold">Ghi chú nội bộ</h2>
        <Textarea
          className="mt-3"
          rows={4}
          value={note ?? order.internalNote ?? ""}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          className="mt-3"
          disabled={noteMutation.isPending}
          onClick={() => noteMutation.mutate(note ?? order.internalNote ?? "")}
        >
          Lưu ghi chú
        </Button>
      </div>

      <div className="glass-card rounded-3xl p-5">
        <h2 className="text-lg font-bold">Lịch sử trạng thái</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {order.history.map((h, idx) => (
            <li key={idx} className="rounded-2xl bg-card px-4 py-2">
              <span className="font-semibold text-primary">{STATUS_LABEL[h.to]}</span> ·{" "}
              {new Date(h.at).toLocaleString("vi-VN")}
              {h.note ? ` · ${h.note}` : ""}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
