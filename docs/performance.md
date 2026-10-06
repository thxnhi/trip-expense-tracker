# Hiệu năng và cache

## Phạm vi cache

- React `cache()` giữ Supabase client, kết quả xác minh tài khoản, nhóm, thành viên và số thông báo trong **một lượt render server**. Các trang và shell không lặp lại cùng request Auth/count. Không chia sẻ client, cookie hay kết quả dữ liệu giữa người dùng hoặc giữa các lượt tải.
- Trang `/privacy` và `/terms` được build tĩnh, dùng cache trang của Next/Vercel. Proxy bỏ qua hai trang này vì không phụ thuộc phiên đăng nhập.
- JavaScript, CSS và font có tên hash dùng cache tài nguyên của Next. Next Link và loading UI hỗ trợ điều hướng client/prefetch; không tải lại toàn bộ ứng dụng khi chuyển trang.
- HTML/RSC và API phụ thuộc phiên đăng nhập không dùng shared CDN cache. Proxy chuyển tiếp các header bảo vệ cache khi Supabase làm mới cookie và đặt `private, no-store` cho request đi qua xác thực.
- Không dùng service worker hoặc localStorage để lưu chi phí, QR, hóa đơn hay signed URLs. Mỗi lần lấy link ảnh vẫn kiểm tra quyền truy cập; ảnh có link ký hết hạn.

## Giảm thời gian chờ

Form tạo expense chỉ tải nhóm và thành viên; không lấy toàn bộ lịch sử expense/yêu cầu tham gia. Sửa metadata bỏ qua danh sách thành viên nếu phần chia đã khóa. Các query độc lập được chạy song song. Các trang công khai không đọc database nghiệp vụ.

Thao tác ghi vẫn dùng transaction RPC và `revalidatePath`; lần render sau thao tác lấy dữ liệu mới. Thay đổi do người khác thực hiện hiển thị khi tải/điều hướng lại; app chưa đồng bộ realtime hay chạy offline.

## Vận hành

Project Supabase hiện tại `anbswvnierolwohtqmpx` ở Tokyo (`ap-northeast-1`), xác minh qua CLI. `vercel.json` đặt Functions ở Tokyo (`hnd1`) để API gần database. Khi chuyển sang Supabase project khác, kiểm tra và đổi region tương ứng. Build production và browser cache cho kết quả khác với Next dev (dev còn compile từng route). Đo trên URL deployment khi Vercel Ready; tránh suy ra tốc độ cloud từ thời gian test local.
