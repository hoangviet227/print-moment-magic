import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminProductsQueryOptions,
  setProductArchived,
  updateVariantPrice,
} from "@/lib/admin.functions";
import { formatVnd } from "@/lib/brand";

export const Route = createFileRoute("/admin/san-pham")({
  component: AdminProducts,
});

function AdminProducts() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(adminProductsQueryOptions);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const priceMutation = useMutation({
    mutationFn: ({ variantId, price }: { variantId: string; price: number }) =>
      updateVariantPrice({ data: { variantId, price } }),
    onSuccess: async () => {
      toast.success("Đã cập nhật giá");
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ productId, archived }: { productId: string; archived: boolean }) =>
      setProductArchived({ data: { productId, archived } }),
    onSuccess: async () => {
      toast.success("Đã cập nhật sản phẩm");
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Đang tải sản phẩm…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-primary">Sản phẩm & bảng giá</h1>

      {(data?.products ?? []).map((p) => (
        <div key={p.id} className="glass-card rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-accent">{p.category}</p>
              <h2 className="text-lg font-bold">{p.name}</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={archiveMutation.isPending}
              onClick={() =>
                archiveMutation.mutate({ productId: p.id, archived: !p.archivedAt })
              }
            >
              {p.archivedAt ? "Mở bán lại" : "Lưu trữ"}
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {p.variants.map((v) => {
              const key = v.id;
              const value = drafts[key] ?? (v.price === null ? "" : String(v.price));
              return (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-card px-4 py-3"
                >
                  <span className="min-w-40 flex-1 text-sm font-semibold">{v.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Hiện tại: {v.price === null ? "Liên hệ" : formatVnd(v.price)}
                  </span>
                  <Input
                    value={value}
                    inputMode="numeric"
                    className="w-32"
                    onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={priceMutation.isPending}
                    onClick={() => {
                      const price = Number(value.replace(/\D/g, ""));
                      if (!Number.isFinite(price)) return toast.error("Giá không hợp lệ");
                      priceMutation.mutate({ variantId: v.id, price });
                    }}
                  >
                    Lưu
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
