# 🛒 Thống kê đơn hàng Shopee

Script chạy trong **Console (F12)** của trình duyệt để thống kê toàn bộ đơn hàng Shopee của bạn — bạn đã chi bao nhiêu tiền, tiết kiệm được bao nhiêu, mua nhiều nhất ở shop nào — và **tự xuất ra một file báo cáo HTML** đẹp (Bootstrap 5) có bộ lọc.

> Không cần cài đặt, không cần extension, không gửi dữ liệu đi đâu cả.

## ✨ Tính năng

- ⚡ **Nhanh**: tải song song nhiều trang đơn hàng cùng lúc
- 📊 **Console gọn**: chỉ hiện số đơn, số sản phẩm, tổng tiền đã chi, tiền tiết kiệm
- 📄 **Báo cáo HTML tự tải về** (`shopee_thong_ke_YYYY-MM-DD.html`):
  - Thẻ tổng quan: số đơn · đã chi · tiết kiệm · số sản phẩm · trung bình/đơn
  - Bộ lọc: tìm kiếm (sản phẩm / shop / mã đơn), shop, trạng thái, năm, tháng, khoảng giá
  - Bảng đơn hàng có sắp xếp theo cột, liệt kê sản phẩm + phân loại + số lượng
  - Top 10 shop và chi tiêu 12 tháng gần nhất
  - Nút **xuất CSV** theo kết quả đang lọc (mở được bằng Excel, đúng tiếng Việt)
- 🔒 Dữ liệu được nhúng sẵn trong file HTML — mở offline vẫn xem được (chỉ cần mạng để tải CSS Bootstrap)

## 🚀 Cách dùng

1. Đăng nhập [shopee.vn](https://shopee.vn) trên máy tính.
2. Mở trang bất kỳ của Shopee (ví dụ **Đơn mua**).
3. Nhấn **F12** → chọn tab **Console**.
4. Copy toàn bộ nội dung file [`thong-ke-shopee.js`](thong-ke-shopee.js), dán vào Console rồi nhấn **Enter**.
   > Nếu Chrome chặn dán, gõ `allow pasting` rồi Enter, sau đó dán lại.
5. Đợi đến khi thấy `✅ Xong` — file báo cáo HTML sẽ tự động tải về. Mở file bằng trình duyệt để xem.

## ⚙️ Tuỳ chỉnh

Sửa các hằng số ở đầu file:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `LIST_TYPE` | `3` | Loại đơn: `3` = Hoàn thành, `0` = Tất cả, `4` = Đã huỷ |
| `LIMIT` | `20` | Số đơn mỗi lần gọi API |
| `BATCH` | `5` | Số trang tải song song mỗi lượt (giảm xuống nếu bị Shopee chặn) |

## 📐 Cách tính

- **Đã chi** = tổng `final_total` của các đơn (số tiền thực trả, đã gồm phí ship và voucher).
- **Tiết kiệm** = tổng giá sản phẩm (`order_price`) − số tiền thực trả. Đây là con số **ước lượng** vì phí vận chuyển cũng nằm trong số tiền thực trả.

## ❓ Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `Không lấy được đơn nào` | Kiểm tra đã đăng nhập và đang ở domain `shopee.vn` |
| Số đơn ít hơn thực tế | Giảm `BATCH` xuống `1`–`2` rồi chạy lại (có thể bị giới hạn tốc độ) |
| Cột Ngày bị trống | Shopee đã đổi cấu trúc API — mở issue kèm kết quả của `fetch('/api/v4/order/get_order_list?list_type=3&offset=0&limit=1').then(r=>r.json()).then(console.log)` (nhớ che thông tin cá nhân) |

## ⚠️ Lưu ý

- Script dùng API nội bộ của Shopee (`/api/v4/order/get_order_list`), có thể ngừng hoạt động bất cứ lúc nào nếu Shopee thay đổi.
- Script **chỉ đọc** dữ liệu của chính tài khoản bạn, không thay đổi gì và không gửi dữ liệu ra ngoài. Hãy đọc code trước khi chạy.
- **Không bao giờ dán vào Console những đoạn code do người lạ gửi** — đó là cách phổ biến để bị đánh cắp tài khoản.
- Dự án không liên kết với Shopee. Dùng cho mục đích cá nhân.

## 📄 License

MIT
