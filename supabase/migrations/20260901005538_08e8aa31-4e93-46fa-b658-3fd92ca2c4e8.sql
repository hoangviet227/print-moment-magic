CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role[]) FROM PUBLIC, anon, authenticated;

ALTER POLICY "Users read own profile" ON public.profiles USING (id = auth.uid() OR private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Authenticated reads active products" ON public.products USING ((is_active AND archived_at IS NULL) OR private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff manage products" ON public.products USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Authenticated reads variants" ON public.product_variants USING ((is_active AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active AND p.archived_at IS NULL)) OR private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff manage variants" ON public.product_variants USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff manage customers" ON public.customers USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff manage orders" ON public.orders USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff manage order items" ON public.order_items USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff manage order files" ON public.order_files USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff reads history" ON public.order_status_history USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff creates history" ON public.order_status_history WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff manage settings" ON public.settings USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff reads audit logs" ON public.audit_logs USING (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
ALTER POLICY "Staff creates audit logs" ON public.audit_logs WITH CHECK (private.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
DROP FUNCTION public.has_role(uuid, public.app_role[]);