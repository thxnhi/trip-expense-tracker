import Link from "next/link";
import type { ReactNode } from "react";
import OfficeIcon from "./OfficeIcon";
export const supportEmail = "huynhcanhvien@gmail.com";
export function PolicyLinks() {
  return (
    <nav className="public-links" aria-label="Thông tin ứng dụng">
      <Link href="/">Giới thiệu</Link>
      <Link href="/privacy">Quyền riêng tư</Link>
      <Link href="/terms">Điều khoản</Link>
      <a href={`mailto:${supportEmail}`}>Liên hệ hỗ trợ</a>
    </nav>
  );
}
export default function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="public-header">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <OfficeIcon name="wallet" size={24} />
          </span>
          <span className="brand-text">
            Chia tiền<span>VĂN PHÒNG</span>
          </span>
        </Link>
        <Link href="/login" className="button-link public-login">
          Đăng nhập / Đăng ký <OfficeIcon name="arrow" size={17} />
        </Link>
      </header>
      <main className="public-content" id="main-content">
        {children}
      </main>
      <footer className="public-footer">
        <div>
          <strong>Chia tiền văn phòng</strong>
          <p>Cùng chi tiêu. Cùng rõ ràng.</p>
        </div>
        <PolicyLinks />
      </footer>
    </div>
  );
}
