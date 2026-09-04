import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const DEFAULT_RETENTION_DAYS = 60;

export const Route = createFileRoute("/api/public/cleanup-files")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: setting } = await supabaseAdmin
          .from("settings")
          .select("value_json")
          .eq("key", "file_retention_days")
          .maybeSingle();

        const raw = setting?.value_json as unknown;
        const days =
          typeof raw === "number" && raw > 0 ? raw : DEFAULT_RETENTION_DAYS;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: orders, error } = await supabaseAdmin
          .from("orders")
          .select("id, order_files(id, storage_path)")
          .lt("updated_at", cutoff)
          .in("status", ["completed", "cancelled"]);
        if (error) return new Response(error.message, { status: 500 });

        const paths: string[] = [];
        const fileIds: string[] = [];
        for (const order of orders ?? []) {
          for (const file of order.order_files ?? []) {
            paths.push(file.storage_path);
            fileIds.push(file.id);
          }
        }

        if (paths.length > 0) {
          await supabaseAdmin.storage.from("order-originals").remove(paths);
          await supabaseAdmin.from("order_files").delete().in("id", fileIds);
        }

        return Response.json({ deleted: paths.length, retentionDays: days });
      },
    },
  },
});
