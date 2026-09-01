# Nhà In Thiên Thiên — website đặt in và quản trị

## Mục tiêu
Xây dựng website production-ready theo hướng **Warm Neighborhood glass flat**, giữ nguyên logo, bảng màu và nội dung thương hiệu từ bộ tài liệu đã tải lên. Luồng hoàn chỉnh: khách chọn sản phẩm → gửi ảnh gốc → nhận mã đơn → quản trị tải file và cập nhật trạng thái → khách tra cứu.

## Giao diện và trải nghiệm
- Tạo design system sáng, nền kem, xanh thương hiệu và cam CTA; glass nhẹ, bo góc thân thiện, tương phản rõ, không dark theme.
- Dùng đúng logo ngang/vuông trong `brand-assets`; font Baloo 2 cho tiêu đề và Nunito Sans cho nội dung.
- Trang chủ `/`: hero đặt in 3 bước, sản phẩm nổi bật và giá lấy từ database, lợi ích, liên hệ Zalo/Xuân Lộc.
- Trang `/dat-in`: form 3 bước, chọn sản phẩm/quy cách/số lượng, thông tin khách, nhận hàng, upload ảnh và tóm tắt sticky/bottom summary.
- Trang `/don-hang/$code`: xác thực bằng mã đơn + số điện thoại, hiển thị chi tiết và tiến trình trạng thái.
- Admin responsive: đăng nhập riêng, dashboard, danh sách/chi tiết đơn, sản phẩm/biến thể, cài đặt; sidebar desktop và điều hướng gọn trên mobile.

## Dữ liệu và bảo mật
- Tạo các bảng sản phẩm, biến thể, khách hàng, đơn hàng, dòng hàng, file, lịch sử trạng thái, cài đặt, hồ sơ và bảng vai trò riêng.
- Seed đầy đủ sản phẩm/giá thử nghiệm trong migration để màn hình đầu tiên có dữ liệu thật.
- Bật RLS cho mọi bảng; catalog công khai chỉ đọc, dữ liệu đơn/file khóa mặc định, quản trị xác thực vai trò phía server.
- Tạo bucket riêng tư cho ảnh đơn hàng; đường dẫn từng đơn `orders/{order_id}/originals/{uuid}-{safe_filename}`.
- Giá và mã đơn `TTYYMMDD-XXX` được tính/tạo phía server; hỗ trợ khóa idempotency để không tạo đơn trùng.

## Upload và nghiệp vụ
- Upload trực tiếp từ trình duyệt lên storage bằng signed upload flow; giữ nguyên file, hỗ trợ JPG/JPEG/PNG/HEIC/WEBP, retry và trạng thái từng file.
- Kiểm tra dung lượng, số lượng, tổng dung lượng và kích thước ảnh ở client; kích thước thấp chỉ cảnh báo.
- Chỉ chuyển đơn sang `pending_review` khi mọi file hoàn tất; lỗi giữ draft để tải tiếp.
- Admin tạo signed URL để xem/tải file, đổi trạng thái hợp lệ, sửa giá/số lượng có lưu audit/history, archive sản phẩm thay vì xóa cứng.

## Chi tiết kỹ thuật
- TanStack Start + React 19 + TypeScript + Tailwind v4; React Hook Form + Zod; server functions cho nghiệp vụ nội bộ.
- Tách route/component theo nhiệm vụ, dùng query loader cho catalog công khai và client query cho dữ liệu quản trị có xác thực.
- Cron dọn file sau số ngày cấu hình (mặc định 60) qua endpoint có xác thực.
- Metadata riêng cho mọi route công khai; admin `noindex`; toast và thông báo lỗi bằng tiếng Việt.

## Kiểm thử nghiệm thu
- Kiểm thử giá, mã đơn/idempotency, retry upload, RLS không đọc chéo đơn, quyền đổi trạng thái và archive sản phẩm.
- Kiểm tra trực quan desktop/mobile cho trang chủ, đặt in, tra cứu và admin.
- Chạy luồng thật đầu-cuối: tạo đơn + upload → admin xem/tải → đổi trạng thái → khách tra cứu trạng thái mới.
