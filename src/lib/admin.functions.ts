import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ORDER_STATUSES = [
  "draft_upload",
  "pending_review",
  "confirmed",
  "processing",
  "producing",
  "ready",
  "completed",
  "cancelled",
  "upload_error",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft_upload: "Đang gửi ảnh",
  pending_review: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý ảnh",
  producing: "Đang in",
  ready: "Sẵn sàng giao",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
  upload_error: "Lỗi tải ảnh",
};

export const STATUS_OPTIONS = ORDER_STATUSES.filter(
  (s) => s !== "draft_upload" && s !== "upload_error",
);

type StaffContext = { supabase: any; userId: string };

async function assertStaff(context: StaffContext) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Tài khoản không có quyền quản trị.");
  return data.map((r: { role: string }) => r.role);
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r: { role: string }) => r.role) };
  });

export type AdminOrderRow = {
  id: string;
  code: string;
  status: OrderStatus;
  createdAt: string;
  total: number;
  customerName: string;
  phone: string;
  fulfillment: string;
  fileCount: number;
};

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ orders: AdminOrderRow[] }> => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, code, status, created_at, total, fulfillment_method, customers(full_name, phone), order_files(id)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      orders: (data ?? []).map((o: any) => ({
        id: o.id,
        code: o.code ?? "",
        status: o.status,
        createdAt: o.created_at,
        total: o.total,
        customerName: o.customers?.full_name ?? "",
        phone: o.customers?.phone ?? "",
        fulfillment: o.fulfillment_method,
        fileCount: (o.order_files ?? []).length,
      })),
    };
  });

export const adminOrdersQueryOptions = queryOptions({
  queryKey: ["admin", "orders"],
  queryFn: () => listOrders(),
});

export type AdminOrderDetail = {
  id: string;
  code: string;
  status: OrderStatus;
  createdAt: string;
  subtotal: number;
  total: number;
  fulfillment: string;
  address: string | null;
  customerNote: string | null;
  internalNote: string | null;
  customerName: string;
  phone: string;
  items: { id: string; name: string; variant: string; quantity: number; unitPrice: number; lineTotal: number }[];
  files: { id: string; name: string; sizeBytes: number; status: string; url: string | null }[];
  history: { to: OrderStatus; at: string; note: string | null }[];
};

export const getOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(3).max(30) }).parse(data))
  .handler(async ({ context, data }): Promise<AdminOrderDetail> => {
    await assertStaff(context);
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(
        "id, code, status, created_at, subtotal, total, fulfillment_method, address, customer_note, internal_note, customers(full_name, phone), order_items(id, product_name_snapshot, variant_name_snapshot, quantity, unit_price, line_total), order_files(id, original_name, size_bytes, upload_status, storage_path), order_status_history(to_status, created_at, note)",
      )
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Không tìm thấy đơn hàng.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const files = await Promise.all(
      ((order as any).order_files ?? []).map(async (f: any) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("order-originals")
          .createSignedUrl(f.storage_path, 60 * 30);
        return {
          id: f.id,
          name: f.original_name,
          sizeBytes: f.size_bytes,
          status: f.upload_status,
          url: signed?.signedUrl ?? null,
        };
      }),
    );

    const o = order as any;
    return {
      id: o.id,
      code: o.code ?? "",
      status: o.status,
      createdAt: o.created_at,
      subtotal: o.subtotal,
      total: o.total,
      fulfillment: o.fulfillment_method,
      address: o.address,
      customerNote: o.customer_note,
      internalNote: o.internal_note,
      customerName: o.customers?.full_name ?? "",
      phone: o.customers?.phone ?? "",
      items: (o.order_items ?? []).map((i: any) => ({
        id: i.id,
        name: i.product_name_snapshot,
        variant: i.variant_name_snapshot,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        lineTotal: i.line_total,
      })),
      files,
      history: (o.order_status_history ?? [])
        .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
        .map((h: any) => ({ to: h.to_status, at: h.created_at, note: h.note })),
    };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(ORDER_STATUSES),
        note: z.string().trim().max(500).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: current, error: readError } = await context.supabase
      .from("orders")
      .select("status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new Error("Không tìm thấy đơn hàng.");

    const patch = {
      status: data.status,
      updated_at: new Date().toISOString(),
      ...(data.status === "completed" ? { completed_at: new Date().toISOString() } : {}),
    };

    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.orderId);
    if (error) throw new Error(error.message);

    await context.supabase.from("order_status_history").insert({
      order_id: data.orderId,
      from_status: current.status,
      to_status: data.status,
      changed_by: context.userId,
      note: data.note || null,
    });

    return { ok: true };
  });

export const updateInternalNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().uuid(), note: z.string().max(2000) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ internal_note: data.note || null })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  isActive: boolean;
  archivedAt: string | null;
  variants: { id: string; name: string; price: number | null; isActive: boolean; unit: string }[];
};

export const listAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ products: AdminProduct[] }> => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("products")
      .select(
        "id, name, slug, category, is_active, archived_at, product_variants(id, name, price, is_active, unit, sort_order)",
      )
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      products: (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        isActive: p.is_active,
        archivedAt: p.archived_at,
        variants: (p.product_variants ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((v: any) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            isActive: v.is_active,
            unit: v.unit,
          })),
      })),
    };
  });

export const adminProductsQueryOptions = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: () => listAdminProducts(),
});

export const updateVariantPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ variantId: z.string().uuid(), price: z.number().int().min(0).max(100000000) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("product_variants")
      .update({ price: data.price, updated_at: new Date().toISOString() })
      .eq("id", data.variantId);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "variant.price.update",
      entity_type: "product_variants",
      entity_id: data.variantId,
      metadata: { price: data.price },
    });
    return { ok: true };
  });

export const setProductArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid(), archived: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("products")
      .update({
        archived_at: data.archived ? new Date().toISOString() : null,
        is_active: !data.archived,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
