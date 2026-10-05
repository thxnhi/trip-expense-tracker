# Deploy Vercel + Supabase + Groq

Tất cả thành phần production chạy trên dịch vụ cloud. Làm staging trước, nghiệm
thu rồi áp dụng cùng cấu hình lên production; sử dụng project database/storage
và credentials khác nhau cho hai môi trường.

## Nhánh `dev` và `main`

- Nhánh `dev` chứa bản chạy thử; PR từ `dev` vào `main` dùng để xét duyệt phát hành.
- Tạo project Vercel staging riêng, đặt **Settings → Environments → Production
  Branch** là `dev`. Vercel sẽ deploy mỗi lần push `dev` lên domain staging cố định.
  Tên môi trường Vercel là Production trong project này, nhưng mọi credentials
  phải thuộc Supabase/Groq staging. `APP_URL` và Supabase Auth Site URL dùng domain staging.
- Project Vercel production riêng theo dõi nhánh `main`, dùng Supabase và secrets
  production. Việc deploy `dev` không làm thay đổi dữ liệu hoặc website production.
- Có thể dùng domain Vercel cấp sẵn cho staging, không cần mua domain để thử app
  trên PC/mobile. Áp dụng migration vào Supabase staging trước lần deploy đầu tiên.

## 1. Supabase

1. Tạo hai project Supabase: staging và production. Chọn region phù hợp người dùng và Vercel.
2. Trong **Connect / API Keys**, lấy project URL, publishable key và secret key. Điền vào env của đúng môi trường.
3. Link CLI và áp dụng migration có phiên bản:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run migrate
```

CLI sẽ hỏi database password khi cần. Nếu chạy CI, dùng `SUPABASE_ACCESS_TOKEN`
và `SUPABASE_DB_PASSWORD` trong secrets của CI. Không chạy migration trong mỗi
request, không cho preview tự push migration vào production.

Migration tạo bảng, transaction RPC, RLS, quyền Auth, bucket private
`office-images` (15 MB; JPEG/PNG/WebP) và chính sách Storage. Kiểm tra bucket vẫn
**private** và RLS bật trên mọi bảng nghiệp vụ. User không có quyền ghi trực tiếp
expense/phần chia; các thao tác dùng RPC có kiểm tra `auth.uid()`.

Migration không đọc hay xóa `local.db` cũ. Sao lưu file legacy nếu còn cần giữ;
dữ liệu mới lưu hoàn toàn trong PostgreSQL.

## 2. Supabase Auth, Google và email

- Trong **Auth → URL Configuration**, đặt Site URL đúng `https://YOUR_APP_DOMAIN`.
- Allowlist Google callback `https://YOUR_APP_DOMAIN/auth/callback`, xác minh
  `https://YOUR_APP_DOMAIN/auth/confirm` và đường dẫn khôi phục
  `https://YOUR_APP_DOMAIN/auth/confirm?next=/reset-password`. Có thể thêm
  `https://YOUR_APP_DOMAIN/**` cho domain ứng dụng do bạn sở hữu.
- Để mở email trên thiết bị khác với thiết bị đăng ký, cấu hình **Auth → Email
  Templates** dùng token hash trực tiếp thay cho link PKCE mặc định. Confirm signup:
  `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">Xác minh tài khoản</a>`.
  Reset password:
  `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Đặt lại mật khẩu</a>`.
  App cấp `.RedirectTo` là `/auth/confirm?next=...` trên domain đã cấu hình,
  giữ đường dẫn nhóm mời sau xác minh; recovery luôn đến `/reset-password`.
- Staging dùng domain staging cố định. Không allowlist wildcard Vercel chung cho
  production; preview chỉ kết nối staging và các domain thuộc project của bạn.
- Bật email/password và **Confirm email**. App có `/auth/confirm` để xử lý email
  `token_hash` theo template ở trên; template mặc định PKCE cũng được hỗ trợ
  khi mở trên cùng browser. Link khôi phục kết thúc tại `/reset-password`.
- Trong **Auth → SMTP Settings**, cấu hình SMTP host/port/user/password, sender
  email và tên hiển thị. Xác minh domain email với nhà cung cấp SMTP.
- Tạo Google OAuth web client ở Google Cloud Console. Authorized JavaScript
  origins gồm domain app; redirect URI dùng callback **Supabase**:
  `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
- Bật Google trong **Supabase Auth → Providers**, nhập client ID/secret. Chỉ
  cấu hình các domain/redirect tương ứng môi trường đó.

Tài liệu: [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google),
[SSR với Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 3. Groq và cấu hình ứng dụng

Tạo Groq API key, bảo đảm project có quyền gọi model vision trong
`GROQ_OCR_MODEL`; mặc định `qwen/qwen3.8-27b`. Giới hạn chi phí trong dashboard.
Nhập key server vào `.env.production` và Vercel Production. Không bật test mock
endpoint ở production; ứng dụng production luôn dùng endpoint Groq chính thức.

Điền các biến app trong `.env.example`, rồi kiểm tra:

```bash
node --env-file=.env.production scripts/check-production-env.mjs
```

Script chỉ báo tên biến sai/thiếu, không in giá trị secrets. Kiểm tra này không
thay thế việc kiểm tra credentials thật hoặc cấu hình Auth dashboard.

## 4. Vercel

1. Import repository vào Vercel, chọn framework Next.js, Node.js 22+.
2. Cấu hình biến app trong **Settings → Environment Variables** cho Production.
   Preview dùng project Supabase staging và secrets staging riêng. Đặt `APP_URL`
   là domain cố định của môi trường đó.
3. Build command `npm run build`, install command `npm ci`. Không thêm migration
   vào build command. NEXT_PUBLIC URL/key phải đúng trước build.
4. OCR và xử lý ảnh dùng Node.js runtime, `maxDuration=60`. Chọn gói hosting hỗ
   trợ tối thiểu 60 giây. Upload trực tiếp Storage; không tạo ổ đĩa uploads trên Vercel.
5. Thêm `CRON_SECRET` ngẫu nhiên ít nhất 32 ký tự. `vercel.json` đăng ký cron
   `/api/cron/cleanup` mỗi ngày 20:00 UTC. Preview không tự chạy cron production.
6. Deploy staging, nghiệm thu. Sau migration production và cấu hình đầy đủ,
   deploy cùng commit lên production. Có thể dùng domain Vercel trước rồi thêm
   domain riêng; cập nhật APP_URL/Auth redirect và rebuild khi đổi domain.

Nếu dùng CLI, link đúng project bằng `npx vercel link`, cấu hình env trên dashboard
và dùng `npx vercel` để preview, `npx vercel --prod` cho production. Đừng import
các dòng Supabase/Vercel access token hay Google/SMTP provisioning vào runtime app.

Tài liệu: [Vercel cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs),
[Vercel Functions limits](https://vercel.com/docs/functions/limitations).

## 5. Nghiệm thu trên URL deploy

- `/api/health` trả 200. Không đăng nhập không xem được dữ liệu/ảnh qua URL trực tiếp.
- Đăng ký, nhận email xác minh, Google login, đăng xuất và khôi phục mật khẩu đều dùng đúng domain.
- Hai tài khoản tạo/tham gia nhóm, được duyệt, tạo expense, báo chuyển và xác nhận; trạng thái hoàn tất đúng.
- QR ngân hàng và hóa đơn chỉ xem được bởi người có quyền. Tài khoản ngoài nhóm/chờ duyệt bị từ chối.
- PC chọn file; Safari iPhone/Chrome Android chụp ảnh, HEIC, đổi ảnh, mạng yếu, quét và nhập tay khi Groq lỗi.
- Expense/ảnh còn nguyên sau redeploy và khi máy phát triển tắt. Thống kê chỉ tính tiền đã xác nhận.
- Cron gọi thiếu secret trả 401; gọi đúng secret dọn orphan nhưng giữ ảnh đang gắn và giữ record để thử lại nếu Storage lỗi.

Không thể hoàn tất deploy thật trước khi có project/credentials được cấp. Sau
khi env/dashboard đầy đủ, thực hiện kiểm tra thật ở trên và ghi URL/commit đã
phát hành vào ghi chú vận hành.

## 6. Sao lưu, theo dõi và rollback

- Theo dõi uptime `/api/health`, tỷ lệ lỗi OCR/upload và lượt chạy cron trong Vercel.
  Log chỉ chứa loại lỗi và số lượng, không ghi hóa đơn, token hay raw provider payload.
- Bật backup database/PITR phù hợp gói Supabase. Trước migration production, xác
  nhận có backup và thử restore vào project tách biệt.
- Database backup **không bao gồm bytes Storage**. Sao lưu bucket private bằng
  quy trình Storage/S3 được kiểm soát và giữ manifest upload/object key cùng thời điểm.
- Rollback app bằng deployment trước trong Vercel. Ưu tiên migration thêm mới để
  app cũ vẫn đọc schema; nếu phải đổi phá vỡ tương thích, chuẩn bị migration sửa
  tiến và restore đã kiểm thử thay vì tùy tiện xóa cột.
- Cron xử lý tối đa 100 record/lượt để giới hạn thời gian. Khi backlog tăng, tăng
  tần suất trong giới hạn gói hoặc dùng scheduler cloud gọi endpoint có Bearer auth;
  các lần chạy có thể thử lại an toàn nhờ claim record trong transaction.
