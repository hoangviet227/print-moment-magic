# Thiên Thiên Prints (94)

PROMPT TỔNG THỂ CHO LOVABLE — NHÀ IN THIÊN THIÊN

Hãy xây dựng website production-ready cho Nhà In Thiên Thiên, responsive chuẩn desktop và mobile, dùng React + TypeScript + Tailwind + Supabase. Giữ đúng nhận diện trong thư mục brand-assets, không tự đổi logo, màu hoặc slogan.

0. Tài liệu hình ảnh bắt buộc

Trước khi code, hãy đọc và dùng ba ảnh trong thư mục ui-mockups làm visual reference chính:

● 01-trang-chu-desktop-mobile.png

● 02-dat-in-upload-desktop-mobile.png

● 03-quan-tri-desktop-mobile.png

Bám sát hệ thống bố cục, độ bo góc, khoảng cách, phân cấp chữ, màu sắc và cách chuyển đổi desktop/mobile trong các ảnh này. Không chép lại lỗi chữ nhỏ có thể phát sinh trong ảnh AI; toàn bộ nội dung hiển thị phải lấy đúng từ prompt và dữ liệu thật. Không tự đổi sang dark theme, không kéo giãn khoảng trống, không làm giao diện rời rạc. Ưu tiên cảm giác hiện đại, gọn, dễ thao tác và đồng nhất trên cả ba khu vực.

1. Thông tin thương hiệu

● Tên: NHÀ IN THIÊN THIÊN

● Slogan: In đẹp từng khoảnh khắc.

● Thông điệp: Giá xưởng cho mọi nhà.

● Website: nhainthienthien.com

● Zalo/điện thoại: 0778 662 227

● Khu vực: Xuân Lộc, Đồng Nai

● Màu chính: #155E9A; xanh sáng #36A9E1; cam CTA #F59E0B; kem #FFF8EA; chữ đậm #123047.

● Quy tắc logo: nền trắng dùng T xanh + T cam; nền xanh dùng T trắng + T cam. Không kéo méo, đổi màu hoặc để logo quá sát mép.

● Phong cách: hiện đại, gần gũi, sạch, dễ thao tác; không giống giao diện studio chụp ảnh.

2. Mục tiêu và phạm vi

Website có hai khu vực:

1. Khách hàng: xem sản phẩm/giá, chọn quy cách và số lượng, nhập thông tin, upload ảnh gốc chất lượng cao, tạo đơn, nhận mã đơn và tra cứu trạng thái.

2. Quản trị: đăng nhập riêng; thêm/sửa/ẩn sản phẩm, upload ảnh đại diện sản phẩm, quản lý kích thước/giá, xem đơn, xem hoặc tải toàn bộ file khách gửi, thay đổi trạng thái và ghi chú nội bộ.

Không tự động sản xuất ngay sau khi khách upload. Đơn mới luôn ở trạng thái Chờ kiểm tra file. Chưa cần thanh toán online ở V1; xưởng xác nhận file và số tiền trước.

3. Sitemap

● / — Trang chủ + sản phẩm + bảng giá nhanh + CTA đặt in.

● /dat-in — Form tạo đơn và upload ảnh.

● /don-hang/[code] — Kết quả/tra cứu đơn bằng mã đơn + SĐT.

● /admin/login — Đăng nhập quản trị.

● /admin — Tổng quan.

● /admin/orders — Danh sách đơn.

● /admin/orders/[id] — Chi tiết đơn + file + tải ZIP.

● /admin/products — Sản phẩm, quy cách và giá.

● /admin/settings — Thông tin cửa hàng, thời gian lưu file, phương thức nhận hàng.

4. Luồng tạo đơn khách hàng

Thiết kế một trang đơn giản, hiển thị 3 bước trên desktop và mobile:

1. Chọn sản phẩm: sản phẩm → kích thước/quy cách → số lượng. Giá cập nhật tức thời.

2. Thông tin: họ tên bắt buộc, SĐT/Zalo bắt buộc, ghi chú không bắt buộc, phương thức nhận tại cửa hàng/giao hàng.

3. Upload ảnh: drag & drop hoặc chọn từ điện thoại; hỗ trợ JPG, JPEG, PNG, HEIC, WEBP; hiển thị tên, dung lượng, thumbnail, tổng dung lượng và tiến trình từng file; cho thêm/xóa/thử lại file.

Yêu cầu upload:

● Upload trực tiếp từ trình duyệt lên Supabase Storage, không đi xuyên qua server app.

● Dùng upload resumable/TUS cho file lớn; có retry khi mạng chập chờn.

● Không resize, recompress hoặc đổi chất lượng file gốc.

● Mỗi đơn có đường dẫn riêng: orders/{order_id}/originals/{uuid}-{safe_filename}.

● Chỉ tạo đơn hoàn tất khi mọi file upload thành công. Nếu lỗi, giữ draft để khách upload tiếp.

● Kiểm tra dimensions phía client. Nếu ảnh nhỏ hơn mức khuyến nghị của quy cách, chỉ cảnh báo, không chặn.

● Giới hạn cấu hình được trong admin: số file/đơn, dung lượng/file, tổng dung lượng/đơn.

● Sau khi tạo thành công, trả mã dạng TTYYMMDD-XXX, hiển thị sản phẩm, file, tiền tạm tính và trạng thái.

5. Quản trị sản phẩm

Mỗi sản phẩm có:

● Tên, slug, mô tả ngắn, nhóm sản phẩm.

● Ảnh đại diện upload lên Storage.

● Thời gian dự kiến.

● Trạng thái hiển thị/ẩn.

● Thứ tự sắp xếp.

● Nhiều biến thể: tên quy cách, chiều rộng/cao, đơn vị, giá, giá khuyến mãi tùy chọn, kích thước pixel khuyến nghị, trạng thái bật/tắt.

Thao tác: tạo, sửa, nhân bản, sắp xếp, ẩn/hiện. Không xóa cứng sản phẩm đã có đơn; chỉ archive.

6. Quản trị đơn hàng

Danh sách có: mã đơn, thời gian, khách, SĐT, sản phẩm, số file, tổng tiền, phương thức nhận và trạng thái. Có tìm theo mã/SĐT/tên; lọc ngày, sản phẩm, trạng thái; phân trang.

Trạng thái chuẩn:

draft_upload → pending_review → confirmed → processing → producing → ready → completed; thêm cancelled và upload_error.

Chi tiết đơn:

● Thông tin khách và sản phẩm đã chốt tại thời điểm đặt.

● Gallery file gốc có filename, kích thước pixel, dung lượng và trạng thái upload.

● Tải một file hoặc tạo link tải ZIP toàn bộ file.

● Ghi chú khách; ghi chú nội bộ; lịch sử thay đổi trạng thái.

● Cho sửa số lượng/giá sau khi xác nhận nhưng phải lưu lịch sử.

● Nút gọi điện, mở Zalo và sao chép mã đơn.

7. Supabase schema

Tạo migration cho các bảng:

● profiles(id, role, full_name, phone, created_at) — role admin/staff.

● products(id, name, slug, category, description, cover_path, turnaround_text, is_active, sort_order, archived_at, created_at, updated_at).

● product_variants(id, product_id, name, width, height, unit, price, sale_price, recommended_width_px, recommended_height_px, is_active, sort_order).

● customers(id, full_name, phone, created_at, updated_at); unique/normalize phone.

● orders(id, code, customer_id, status, subtotal, discount, total, fulfillment_method, address, customer_note, internal_note, created_at, updated_at).

● order_items(id, order_id, product_id, variant_id, product_name_snapshot, variant_name_snapshot, unit_price, quantity, line_total).

● order_files(id, order_id, storage_path, original_name, mime_type, size_bytes, width_px, height_px, upload_status, created_at).

● order_status_history(id, order_id, from_status, to_status, note, changed_by, created_at).

● settings(key, value_json, updated_at).

Indexes: orders(code) unique, orders(status, created_at desc), customers(phone), order_files(order_id), product_variants(product_id, sort_order).

8. Bảo mật

● Khách không cần tài khoản.

● Không để bucket đơn hàng public.

● Tạo signed upload URL/session theo draft order token ngắn hạn; token chỉ truy cập đúng folder đơn đó.

● Admin/staff dùng Supabase Auth. RLS bắt buộc trên tất cả bảng.

● Khách chỉ được tạo draft, upload vào draft của mình và xem kết quả bằng mã đơn + SĐT/token; không được list đơn/file khác.

● Admin/staff mới được xem file, tạo signed download URL và sửa trạng thái.

● Log thao tác quản trị quan trọng.

● Tự xóa file sau 60 ngày tính từ khi đơn completed, chạy bằng cron/edge function; số ngày cấu hình trong settings.

9. Dữ liệu mẫu ban đầu

Seed các giá thử nghiệm:

● Ảnh gỗ lụa: 13×18 39k; 15×21 49k; 20×30 69k; 30×45 109k; 40×60 159k; 50×75 239k; 60×90 329k.

● Tráng gương: 13×18 59k; 15×21 69k; 20×30 99k; 30×45 179k; 40×60 269k; 50×75 349k; 60×90 449k.

● Ảnh thẻ: 4 ảnh 4×6 = 50k.

● Phục hồi ảnh cũ: từ 100k; yêu cầu xưởng báo giá trước.

● Ảnh nam châm: bộ 6 ảnh = 99k.

● Album: liên hệ báo giá.

Giá phải đọc từ database, tuyệt đối không hardcode trong component. Hiển thị nhãn “giá tạm tính” cho sản phẩm cần duyệt file.

10. UI/UX responsive

● Mobile-first, nút và input tối thiểu 44px.

● Desktop form đặt hàng: nội dung trái, tóm tắt đơn sticky bên phải.

● Mobile: từng bước xếp dọc; tóm tắt đơn dạng card cuối trang hoặc bottom sheet, không che vùng upload.

● Admin desktop dùng sidebar; mobile dùng topbar + drawer. Bảng đơn desktop chuyển thành card trên mobile.

● Trạng thái upload rõ: chờ, đang tải, xử lý, hoàn tất, lỗi.

● Có loading, empty, error, offline/retry và success states.

● Không dùng carousel/animation dư thừa. Motion nhẹ, ưu tiên tốc độ.

● Đảm bảo contrast, label, focus, keyboard và screen reader.

11. Yêu cầu kỹ thuật và nghiệm thu

● React + TypeScript strict; component nhỏ, dễ bảo trì.

● Không sửa logic unrelated trong các lần update.

● Validate form bằng Zod/React Hook Form.

● Dùng Server Actions/Edge Functions cho nghiệp vụ tin cậy; không tin giá client gửi lên, server phải tính lại từ DB.

● File order phải có idempotency để bấm lại không tạo hai đơn.

● Có audit log, error handling và thông báo toast tiếng Việt.

● SEO trang công khai; admin noindex.

● Không lộ service-role key ở client.

● Test tối thiểu: tính giá, tạo mã đơn, upload retry, RLS khách không đọc đơn khác, admin đổi trạng thái, archive sản phẩm.

Hoàn thành khi luồng thật chạy được từ khách tạo đơn + upload ảnh gốc → admin thấy đơn → admin tải file → đổi trạng thái → khách tra cứu được.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://print-moment-magic.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a422f47e-e73e-4415-9671-93a164598b87).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
