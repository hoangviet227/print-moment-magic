import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("84")) return "0" + digits.slice(2);
  return digits;
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function todayCode(): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // giờ Việt Nam
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `TT${yy}${mm}${dd}`;
}

function safeFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(-80) || "anh.jpg"
  );
}

const createOrderSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  note: z.string().trim().max(1000).optional().default(""),
  fulfillment: z.enum(["pickup", "delivery"]),
  address: z.string().trim().max(300).optional().default(""),
  idempotencyKey: z.string().min(8).max(80),
  items: z
    .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(500) }))
    .min(1)
    .max(20),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const existing = await supabaseAdmin
      .from("orders")
      .select("id, code")
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing.data) {
      return { orderId: existing.data.id, code: existing.data.code ?? "", accessToken: "" };
    }

    const { data: variants, error: variantError } = await supabaseAdmin
      .from("product_variants")
      .select("id, name, price, sale_price, requires_quote, product_id, products(name)")
      .in(
        "id",
        data.items.map((i) => i.variantId),
      );
    if (variantError) throw new Error(variantError.message);
    if (!variants || variants.length !== new Set(data.items.map((i) => i.variantId)).size) {
      throw new Error("Quy cách sản phẩm không hợp lệ.");
    }

    const lines = data.items.map((item) => {
      const variant = variants.find((v) => v.id === item.variantId)!;
      const unitPrice = variant.requires_quote ? 0 : (variant.sale_price ?? variant.price ?? 0);
      return {
        product_id: variant.product_id,
        variant_id: variant.id,
        product_name_snapshot: variant.products?.name ?? "Sản phẩm",
        variant_name_snapshot: variant.name,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: unitPrice * item.quantity,
      };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);

    const phoneNormalized = normalizePhone(data.phone);
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({
        full_name: data.fullName,
        phone: data.phone,
        phone_normalized: phoneNormalized,
      })
      .select("id")
      .single();
    if (customerError) throw new Error(customerError.message);

    const accessToken = crypto.randomUUID().replace(/-/g, "");
    const accessTokenHash = await sha256Hex(accessToken);
    const prefix = todayCode();

    let orderId = "";
    let code = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      const { count } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .like("code", `${prefix}-%`);
      code = `${prefix}-${String((count ?? 0) + 1 + attempt).padStart(3, "0")}`;
      const { data: inserted, error } = await supabaseAdmin
        .from("orders")
        .insert({
          code,
          customer_id: customer.id,
          status: "draft_upload",
          subtotal,
          discount: 0,
          total: subtotal,
          fulfillment_method: data.fulfillment,
          address: data.fulfillment === "delivery" ? data.address : null,
          customer_note: data.note || null,
          access_token_hash: accessTokenHash,
          idempotency_key: data.idempotencyKey,
        })
        .select("id")
        .single();
      if (!error && inserted) {
        orderId = inserted.id;
        break;
      }
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    }
    if (!orderId) throw new Error("Không tạo được mã đơn, vui lòng thử lại.");

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: orderId })));
    if (itemsError) throw new Error(itemsError.message);

    return { orderId, code, accessToken };
  });

const uploadTicketSchema = z.object({
  orderId: z.string().uuid(),
  accessToken: z.string().min(10),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(100),
  sizeBytes: z.number().int().min(1).max(MAX_FILE_BYTES),
});

async function assertOrderAccess(orderId: string, accessToken: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await sha256Hex(accessToken);
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, access_token_hash, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.access_token_hash !== hash) throw new Error("Không có quyền với đơn hàng này.");
  return data;
}

export const createUploadTicket = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => uploadTicketSchema.parse(data))
  .handler(async ({ data }) => {
    if (!ALLOWED_MIME.includes(data.mimeType.toLowerCase())) {
      throw new Error("Định dạng ảnh không được hỗ trợ.");
    }
    await assertOrderAccess(data.orderId, data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const path = `orders/${data.orderId}/originals/${crypto.randomUUID()}-${safeFileName(data.fileName)}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("order-originals")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Không tạo được đường dẫn tải lên.");

    const { data: fileRow, error: fileError } = await supabaseAdmin
      .from("order_files")
      .insert({
        order_id: data.orderId,
        storage_path: path,
        original_name: data.fileName,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        upload_status: "uploading",
      })
      .select("id")
      .single();
    if (fileError) throw new Error(fileError.message);

    return { fileId: fileRow.id, path, token: signed.token };
  });

const markFileSchema = z.object({
  orderId: z.string().uuid(),
  accessToken: z.string().min(10),
  fileId: z.string().uuid(),
  status: z.enum(["complete", "error"]),
  widthPx: z.number().int().positive().optional(),
  heightPx: z.number().int().positive().optional(),
});

export const markFileStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => markFileSchema.parse(data))
  .handler(async ({ data }) => {
    await assertOrderAccess(data.orderId, data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("order_files")
      .update({
        upload_status: data.status,
        width_px: data.widthPx ?? null,
        height_px: data.heightPx ?? null,
      })
      .eq("id", data.fileId)
      .eq("order_id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const submitSchema = z.object({
  orderId: z.string().uuid(),
  accessToken: z.string().min(10),
});

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    await assertOrderAccess(data.orderId, data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: files, error: filesError } = await supabaseAdmin
      .from("order_files")
      .select("id, upload_status")
      .eq("order_id", data.orderId);
    if (filesError) throw new Error(filesError.message);
    if (!files || files.length === 0) throw new Error("Đơn chưa có ảnh nào được tải lên.");

    const allDone = files.every((f) => f.upload_status === "complete");
    const nextStatus = allDone ? "pending_review" : "upload_error";

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("order_status_history").insert({
      order_id: data.orderId,
      from_status: "draft_upload",
      to_status: nextStatus,
      note: allDone ? "Khách gửi ảnh thành công" : "Còn file lỗi khi tải lên",
    });

    return { status: nextStatus, allDone };
  });

const lookupSchema = z.object({
  code: z.string().trim().min(4).max(30),
  phone: z.string().trim().min(8).max(20),
});

export type OrderLookupResult = {
  code: string;
  status: string;
  createdAt: string;
  total: number;
  fulfillment: string;
  address: string | null;
  note: string | null;
  customerName: string;
  items: { name: string; variant: string; quantity: number; lineTotal: number }[];
  fileCount: number;
  history: { to: string; at: string; note: string | null }[];
};

export const lookupOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => lookupSchema.parse(data))
  .handler(async ({ data }): Promise<OrderLookupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phoneNormalized = normalizePhone(data.phone);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, code, status, created_at, total, fulfillment_method, address, customer_note, customers!inner(full_name, phone_normalized), order_items(product_name_snapshot, variant_name_snapshot, quantity, line_total), order_files(id), order_status_history(to_status, created_at, note)",
      )
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!order || order.customers?.phone_normalized !== phoneNormalized) {
      throw new Error("Không tìm thấy đơn hàng khớp mã đơn và số điện thoại.");
    }

    return {
      code: order.code ?? "",
      status: order.status,
      createdAt: order.created_at,
      total: order.total,
      fulfillment: order.fulfillment_method,
      address: order.address,
      note: order.customer_note,
      customerName: order.customers?.full_name ?? "",
      items: (order.order_items ?? []).map((i) => ({
        name: i.product_name_snapshot,
        variant: i.variant_name_snapshot,
        quantity: i.quantity,
        lineTotal: i.line_total,
      })),
      fileCount: (order.order_files ?? []).length,
      history: (order.order_status_history ?? [])
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((h) => ({ to: h.to_status, at: h.created_at, note: h.note })),
    };
  });
