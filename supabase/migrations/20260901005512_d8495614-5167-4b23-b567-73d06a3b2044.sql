CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.order_status AS ENUM ('draft_upload', 'pending_review', 'confirmed', 'processing', 'producing', 'ready', 'completed', 'cancelled', 'upload_error');
CREATE TYPE public.fulfillment_method AS ENUM ('pickup', 'delivery');
CREATE TYPE public.upload_status AS ENUM ('pending', 'uploading', 'complete', 'error');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)) $$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role[]) TO authenticated, service_role;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_path text,
  turnaround_text text NOT NULL DEFAULT '1–2 ngày',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active products" ON public.products FOR SELECT TO anon USING (is_active AND archived_at IS NULL);
CREATE POLICY "Authenticated reads active products" ON public.products FOR SELECT TO authenticated USING ((is_active AND archived_at IS NULL) OR public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
CREATE POLICY "Staff manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  width numeric,
  height numeric,
  unit text NOT NULL DEFAULT 'cm',
  price integer,
  sale_price integer,
  requires_quote boolean NOT NULL DEFAULT false,
  recommended_width_px integer,
  recommended_height_px integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (price IS NULL OR price >= 0),
  CHECK (sale_price IS NULL OR sale_price >= 0)
);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active variants" ON public.product_variants FOR SELECT TO anon USING (is_active AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active AND p.archived_at IS NULL));
CREATE POLICY "Authenticated reads variants" ON public.product_variants FOR SELECT TO authenticated USING ((is_active AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active AND p.archived_at IS NULL)) OR public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
CREATE POLICY "Staff manage variants" ON public.product_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_normalized)
);
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage customers" ON public.customers FOR ALL TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  status public.order_status NOT NULL DEFAULT 'draft_upload',
  subtotal integer NOT NULL DEFAULT 0,
  discount integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  fulfillment_method public.fulfillment_method NOT NULL,
  address text,
  customer_note text,
  internal_note text,
  access_token_hash text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (subtotal >= 0 AND discount >= 0 AND total >= 0)
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  product_name_snapshot text NOT NULL,
  variant_name_snapshot text NOT NULL,
  unit_price integer NOT NULL,
  quantity integer NOT NULL,
  line_total integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (unit_price >= 0 AND quantity > 0 AND line_total >= 0)
);
GRANT SELECT, UPDATE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE TABLE public.order_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  width_px integer,
  height_px integer,
  upload_status public.upload_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (size_bytes >= 0)
);
GRANT SELECT, UPDATE ON public.order_files TO authenticated;
GRANT ALL ON public.order_files TO service_role;
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage order files" ON public.order_files FOR ALL TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff reads history" ON public.order_status_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
CREATE POLICY "Staff creates history" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[])) WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff reads audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));
CREATE POLICY "Staff creates audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ARRAY['admin','staff']::public.app_role[]));

CREATE INDEX orders_status_created_idx ON public.orders(status, created_at DESC);
CREATE INDEX customers_phone_idx ON public.customers(phone_normalized);
CREATE INDEX order_files_order_idx ON public.order_files(order_id);
CREATE INDEX product_variants_product_sort_idx ON public.product_variants(product_id, sort_order);
CREATE INDEX order_history_order_idx ON public.order_status_history(order_id, created_at);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER variants_updated BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.products (id, name, slug, category, description, turnaround_text, sort_order) VALUES
('10000000-0000-0000-0000-000000000001','Ảnh gỗ lụa','anh-go-lua','Ảnh trang trí','Sang trọng, bền đẹp, bề mặt lụa mịn.','1–2 ngày',1),
('10000000-0000-0000-0000-000000000002','Tráng gương','trang-guong','Ảnh trang trí','Bề mặt bóng sáng, màu sắc trong trẻo.','1–2 ngày',2),
('10000000-0000-0000-0000-000000000003','Ảnh thẻ','anh-the','Ảnh tiện ích','Đúng chuẩn, chỉnh sáng và lấy nhanh.','Trong ngày',3),
('10000000-0000-0000-0000-000000000004','Phục hồi ảnh cũ','phuc-hoi-anh-cu','Dịch vụ ảnh','Phục hồi chi tiết và màu sắc kỷ niệm.','Báo sau khi duyệt file',4),
('10000000-0000-0000-0000-000000000005','Ảnh nam châm','anh-nam-cham','Quà tặng','Bộ ảnh nhỏ xinh, dính chắc trên bề mặt kim loại.','1–2 ngày',5),
('10000000-0000-0000-0000-000000000006','Album','album','Album','Lưu giữ trọn bộ khoảnh khắc theo thiết kế riêng.','Liên hệ báo giá',6);

INSERT INTO public.product_variants (product_id,name,width,height,unit,price,sale_price,requires_quote,recommended_width_px,recommended_height_px,sort_order) VALUES
('10000000-0000-0000-0000-000000000001','13×18 cm',13,18,'cm',39000,NULL,false,1535,2126,1),
('10000000-0000-0000-0000-000000000001','15×21 cm',15,21,'cm',49000,NULL,false,1772,2480,2),
('10000000-0000-0000-0000-000000000001','20×30 cm',20,30,'cm',69000,NULL,false,2362,3543,3),
('10000000-0000-0000-0000-000000000001','30×45 cm',30,45,'cm',109000,NULL,false,3543,5315,4),
('10000000-0000-0000-0000-000000000001','40×60 cm',40,60,'cm',159000,NULL,false,4724,7087,5),
('10000000-0000-0000-0000-000000000001','50×75 cm',50,75,'cm',239000,NULL,false,5906,8858,6),
('10000000-0000-0000-0000-000000000001','60×90 cm',60,90,'cm',329000,NULL,false,7087,10630,7),
('10000000-0000-0000-0000-000000000002','13×18 cm',13,18,'cm',59000,NULL,false,1535,2126,1),
('10000000-0000-0000-0000-000000000002','15×21 cm',15,21,'cm',69000,NULL,false,1772,2480,2),
('10000000-0000-0000-0000-000000000002','20×30 cm',20,30,'cm',99000,NULL,false,2362,3543,3),
('10000000-0000-0000-0000-000000000002','30×45 cm',30,45,'cm',179000,NULL,false,3543,5315,4),
('10000000-0000-0000-0000-000000000002','40×60 cm',40,60,'cm',269000,NULL,false,4724,7087,5),
('10000000-0000-0000-0000-000000000002','50×75 cm',50,75,'cm',349000,NULL,false,5906,8858,6),
('10000000-0000-0000-0000-000000000002','60×90 cm',60,90,'cm',449000,NULL,false,7087,10630,7),
('10000000-0000-0000-0000-000000000003','4 ảnh 4×6',4,6,'cm',50000,NULL,false,472,709,1),
('10000000-0000-0000-0000-000000000004','Duyệt và báo giá',NULL,NULL,'dịch vụ',100000,NULL,true,NULL,NULL,1),
('10000000-0000-0000-0000-000000000005','Bộ 6 ảnh',NULL,NULL,'bộ',99000,NULL,false,900,900,1),
('10000000-0000-0000-0000-000000000006','Thiết kế theo yêu cầu',NULL,NULL,'album',NULL,NULL,true,NULL,NULL,1);

INSERT INTO public.settings (key,value_json) VALUES
('upload_limits','{"max_files":40,"max_file_mb":50,"max_total_mb":500,"allowed_types":["image/jpeg","image/png","image/heic","image/webp"]}'::jsonb),
('file_retention_days','60'::jsonb),
('fulfillment_methods','["pickup","delivery"]'::jsonb),
('shop','{"name":"NHÀ IN THIÊN THIÊN","phone":"0778662227","location":"Xuân Lộc, Đồng Nai"}'::jsonb);