# Chia tiền văn phòng

Web app tiếng Việt để ứng tiền và thu lại tiền trong nhóm. Người tạo expense chọn
người chia, thành viên báo đã chuyển, người ứng tiền xác nhận; expense hoàn tất
khi tất cả khoản cần chuyển được xác nhận. Dùng cùng một URL trên PC và mobile.

## Tính năng

- Google hoặc email/mật khẩu; xác minh email và khôi phục mật khẩu.
- Nhóm riêng tư, link mời và duyệt thành viên.
- Hồ sơ ngân hàng, nội dung chuyển khoản và QR riêng của từng tài khoản.
- Chia đều hoặc số tiền riêng, chọn tất cả/bỏ người; tiền tính chính xác theo tiền tệ nhóm.
- Báo chuyển, xác nhận/từ chối, lịch sử thanh toán, hủy để đối soát.
- Thông báo trong app và thống kê theo nhóm, thành viên, ngày.
- Mobile chụp hóa đơn hoặc chọn ảnh; PC chọn file. Quét ảnh bằng Groq rồi kiểm tra trước khi lưu.

## Kiến trúc

| Thành phần                             | Dịch vụ           |
| -------------------------------------- | ----------------- |
| Giao diện và API Next.js 16 / React 19 | Vercel            |
| PostgreSQL, transaction RPC và RLS     | Supabase Database |
| Tài khoản, Google, session và email    | Supabase Auth     |
| Ảnh hóa đơn và QR private              | Supabase Storage  |
| Đọc hóa đơn từ ảnh                     | Groq Vision API   |

Production chạy hoàn toàn trên cloud. Không cần máy cá nhân bật, SQLite, ổ đĩa
uploads hay Ollama. Có thể nhập expense bằng tay khi OCR chưa được cấu hình.

## Chạy phát triển

Cần Node.js 22+ và npm. Dùng một project Supabase phát triển riêng hoặc chạy
Supabase local bằng Docker:

```bash
npm ci
cp .env.example .env.local
npm run db:start
npx supabase status
```

Điền URL/key của Supabase local vào `.env.local`, bao gồm publishable/anon key và
secret/service-role key. Supabase local tạo database, Auth, Storage và hộp thư
local. Migration trong `supabase/migrations/` được áp dụng khi khởi động local;
để làm mới schema trên môi trường local có thể dùng `npx supabase db reset` — lệnh
này xóa dữ liệu local, không dùng cho dữ liệu cần giữ.

```bash
npm run dev
```

Mở `http://localhost:3000`. Email local xem ở `http://localhost:54324`.
Với project Supabase hosted, link CLI đến project và chạy `npm run migrate`
trước khi chạy app. Không dùng project production để phát triển hoặc kiểm thử.

## Biến môi trường

Mẫu đầy đủ nằm trong [`.env.example`](.env.example); `.env.local.example` có cùng nội dung.
Các file `.env.local`, `.env.production` và `.env.test.local` được gitignore.

| Biến                                   | Mục đích                                                          |
| -------------------------------------- | ----------------------------------------------------------------- |
| `APP_URL`                              | URL HTTPS production, hoặc `http://localhost:3000` khi phát triển |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL project Supabase                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key; có thể dùng legacy anon key                      |
| `SUPABASE_SECRET_KEY`                  | Secret key hoặc legacy service-role key, chỉ ở server             |
| `GROQ_API_KEY`                         | Server gọi OCR; không cần cho nhập tay                            |
| `GROQ_OCR_MODEL`                       | Mặc định `qwen/qwen3.8-27b`, có thể đổi model vision tương thích  |
| `CRON_SECRET`                          | Chuỗi ngẫu nhiên ít nhất 32 ký tự để bảo vệ dọn ảnh               |

Google OAuth và SMTP được cấu hình trong **Supabase Auth dashboard**, không phải
client hoặc biến `NEXT_PUBLIC_*`. Các thông tin CLI/dashboard tùy chọn được chú
thích trong mẫu env; không import các thông tin quản trị đó vào Vercel.

```bash
cp .env.example .env.production
# Điền cấu hình production trong file; không commit hoặc gửi secrets vào chat.
node --env-file=.env.production scripts/check-production-env.mjs
```

`.env.production` trên máy không tự cấu hình Vercel: phải đưa các biến app ở trên
vào dashboard Vercel trước build, vì `NEXT_PUBLIC_*` được cố định trong bundle khi build.
Xem [hướng dẫn deploy đầy đủ](docs/deployment.md).

## Ảnh và OCR

Ảnh upload trực tiếp từ browser đến **Supabase Storage private** qua token giới
hạn vào một đường dẫn server cấp. Dùng TUS để thử lại khi mạng mobile gián đoạn;
file không đi qua giới hạn request 4,5 MB của Vercel.

- Hóa đơn tối đa 15 MB; QR tối đa 5 MB. Nhận JPEG/PNG/WebP và chuyển HEIC sang JPEG trên browser.
- Browser chuẩn hóa kích thước; server kiểm tra bytes thật, xoay ảnh, bỏ EXIF và tạo JPEG xem trước.
- Ảnh private chỉ xem được sau kiểm tra session/RLS, bằng signed URL 5 phút.
- OCR gửi bản chuẩn hóa tới Groq khi người dùng bấm **Quét hóa đơn**; kết quả luôn phải kiểm tra trước lưu.
- Mỗi tài khoản tối đa 1 lượt quét đồng thời và 10 lượt/phút, lưu trên PostgreSQL.
- Deadline OCR là 45 giây; lỗi ảnh/mạng/provider cho phép nhập tay hoặc thử lại thủ công, không tự gọi lại Groq.
- Cron daily lúc 20:00 UTC dọn tối đa 100 ảnh chưa gắn expense/hồ sơ, đã cũ hơn 24 giờ. Với lưu lượng cao, tăng tần suất theo gói Vercel hoặc chạy thêm lượt cron có xác thực.

Tham khảo chính thức: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads),
[Groq Vision](https://console.groq.com/docs/vision).

## Kiểm thử

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Unit/integration tests dùng Vitest và PostgreSQL/PGlite cho migration, RPC, RLS,
làm tròn và thống kê; OCR/provider dùng mock để không phát sinh phí.

Kiểm thử browser dùng Supabase local thật, không dùng production. Điền local
URL/key vào `.env.test.local`, đặt `APP_URL=http://localhost:3100`, rồi chạy:

```bash
npm run db:start
npm run e2e:prepare
npx playwright install chromium
npm run e2e
```

E2E dùng Next dev port 3100, build cache `.next-e2e` riêng và mock Groq local.
Nếu Chromium đã có sẵn trong cache Playwright (kể cả bản cài bằng Python),
cấu hình tự tìm và dùng lại nên có thể bỏ bước tải browser. Có thể chỉ định
đường dẫn binary bằng `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
Kiểm tra camera thực tế trên Safari iPhone và Chrome Android trước phát hành:
quyền camera/bộ chọn ảnh, HEIC, mạng yếu và kiểm tra lại các trường đã quét.

GitHub Actions trong [`.github/workflows/check.yml`](.github/workflows/check.yml)
chạy lint, typecheck, unit/integration tests, production build và E2E trên Supabase
Docker local. Không cần credentials production; Groq được mock. Trace và ảnh lỗi
browser giữ 7 ngày; CLI startup log chứa credentials local không được upload.

## Vận hành và giới hạn bản đầu

`GET /api/health` trả `ok`/`unavailable` và mã 200/503, không lộ credentials hoặc
invoice. Vercel logs không ghi raw phản hồi Groq hay signed URL. Cron yêu cầu
`Authorization: Bearer <CRON_SECRET>`; Vercel tự gửi header này khi cấu hình secret.

Chưa hỗ trợ trả từng phần, đối soát giao dịch ngân hàng, QR động, xuất CSV hay
email thông báo nghiệp vụ. Dữ liệu chuyến đi cũ không được chuyển hoặc tự xóa;
các đường dẫn công khai cũ đã đóng. Bộ kiểm thử legacy giữ riêng để kiểm tra phép
tính/migration cũ, không dùng làm luồng production mới.
