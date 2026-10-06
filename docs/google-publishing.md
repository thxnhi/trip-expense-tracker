# Google OAuth cho Chia tiền văn phòng

Các trang `/`, `/privacy`, `/terms` mở công khai, không cần tài khoản. Email hỗ trợ hiện tại là `huynhcanhvien@gmail.com`, lấy từ cấu hình Google của người vận hành. Cập nhật `supportEmail` trong `src/app/components/PublicPage.tsx` nếu đổi người vận hành.

## Branding

| Trường                  | Giá trị                                                |
| ----------------------- | ------------------------------------------------------ |
| App name                | Chia tiền văn phòng                                    |
| User support email      | huynhcanhvien@gmail.com                                |
| Application home page   | https://trip-expense-tracker-office.vercel.app         |
| Privacy policy link     | https://trip-expense-tracker-office.vercel.app/privacy |
| Terms of service link   | https://trip-expense-tracker-office.vercel.app/terms   |
| Developer contact email | huynhcanhvien@gmail.com                                |

Đợi Vercel deploy thành công và mở thử ba trang trước khi lưu các URL. Không cần upload logo nếu chưa có logo của app. Authorized domains dùng hostname, không có scheme hoặc path. Nếu Google báo domain không hợp lệ, xử lý đúng thông báo của Console; không khai quyền sở hữu domain của nhà cung cấp.

## Clients và Supabase

Trong Google Auth Platform → Clients, chọn Web client có ID đang dùng trong Supabase:

- Authorized JavaScript origins: `https://trip-expense-tracker-office.vercel.app`
- Authorized redirect URIs: `https://anbswvnierolwohtqmpx.supabase.co/auth/v1/callback`

Supabase → Authentication → URL Configuration:

- Site URL: `https://trip-expense-tracker-office.vercel.app`
- Redirect URLs: `https://trip-expense-tracker-office.vercel.app/**`

## Audience và Data Access

User type: External. Audience → Publish app chuyển trạng thái sang In production. Data Access chỉ cần `openid`, `userinfo.email`, `userinfo.profile`. Các quyền cơ bản có ngoại lệ với danh sách test users; publish không sửa lỗi callback mismatch.

Publish app ở Audience và xác minh/publish branding là hai thao tác riêng. Nếu Google yêu cầu xác minh branding, xử lý theo Verification Center và xác minh quyền sở hữu domain bạn kiểm soát trong Search Console. Không cam kết Google sẽ chấp nhận các domain của nhà cung cấp hay tự động duyệt app. Không khai đã xác minh khi chưa thực hiện.

Kiểm tra đăng nhập bằng tài khoản Google khác trong cửa sổ ẩn danh. Google Workspace có thể hạn chế ứng dụng theo chính sách tổ chức. Không cần redeploy khi chỉ đổi provider settings.

Tài liệu: [Branding](https://support.google.com/cloud/answer/15549049), [Audience](https://support.google.com/cloud/answer/15549945), [Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google).
