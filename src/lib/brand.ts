export const BRAND = {
  name: "NHÀ IN THIÊN THIÊN",
  shortName: "Thiên Thiên",
  slogan: "In đẹp từng khoảnh khắc.",
  message: "Giá xưởng cho mọi nhà.",
  contactName: "Xuân Lộc",
  phone: "0348 372 890",
  zalo: "https://zalo.me/0348372890",
  address: "Nhà In Thiên Thiên",
} as const;

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}
