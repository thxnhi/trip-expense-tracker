import Link from "next/link";
import AuthForm from "./AuthForm";
import { safeNext, supabaseConfigured } from "@/lib/supabase/config";
import { PolicyLinks } from "../components/PublicPage";
import OfficeIcon from "../components/OfficeIcon";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <div className="auth-layout">
      <aside className="auth-art">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <OfficeIcon name="wallet" size={24} />
          </span>
          <span className="brand-text">
            Chia tiền<span>VĂN PHÒNG</span>
          </span>
        </Link>
        <div className="auth-art-copy">
          <p className="eyebrow">CÙNG CHI TIÊU, CÙNG RÕ RÀNG</p>
          <h2>
            Một khoản chi chung.
            <br />
            <span>Nhẹ nhàng cho cả nhóm.</span>
          </h2>
          <p>
            Ghi khoản đã ứng, chia đúng người và biết rõ khi nào mọi khoản hoàn
            trả đã hoàn tất.
          </p>
        </div>
        <p className="auth-art-bottom">
          Dùng trên máy tính và điện thoại · Riêng tư trong nhóm
        </p>
      </aside>
      <main className="page auth-page">
        <Link href="/" className="back-link">
          ← Chia tiền văn phòng
        </Link>
        <section className="card">
          <h1>Chia tiền dễ dàng</h1>
          <p className="muted">Cùng nhóm ghi chi phí và xác nhận hoàn trả.</p>
          {!supabaseConfigured() ? (
            <div className="setup-panel" role="status">
              <h2>Cấu hình ứng dụng</h2>
              <p>
                Tạo <code>.env.local</code> từ <code>.env.example</code>, điền
                URL và publishable key Supabase, rồi áp dụng migration. Khi
                deploy, khai báo biến môi trường trên Vercel.
              </p>
              <p>Xem README để cấu hình đăng nhập, lưu ảnh và quét hóa đơn.</p>
            </div>
          ) : (
            <AuthForm
              next={safeNext(params.next)}
              initialError={
                params.error
                  ? "Liên kết đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."
                  : undefined
              }
              message={
                params.password === "updated"
                  ? "Đã đổi mật khẩu. Đăng nhập lại để tiếp tục."
                  : undefined
              }
            />
          )}
        </section>
        <PolicyLinks />
      </main>
    </div>
  );
}
