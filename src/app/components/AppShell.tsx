import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { requireUser } from "@/lib/supabase/server";
import { unreadNotifications } from "@/lib/office-data";
import { PolicyLinks } from "./PublicPage";
import AppNavigation from "./AppNavigation";
import OfficeIcon from "./OfficeIcon";
export default async function AppShell({ children }: { children: ReactNode }) {
  const [{ user }, count] = await Promise.all([
    requireUser(),
    unreadNotifications(),
  ]);
  const name = String(
    user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Tài khoản của bạn",
  );
  const initials = name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(-2)
    .join("")
    .toUpperCase();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <aside className="app-sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <OfficeIcon name="wallet" size={24} />
          </span>
          <span className="brand-text">
            Chia tiền<span>VĂN PHÒNG</span>
          </span>
        </Link>
        <p className="nav-eyebrow">KHÔNG GIAN CỦA BẠN</p>
        <AppNavigation count={count || 0} />
        <div className="sidebar-tip">
          <span className="tip-icon">
            <OfficeIcon name="receipt" size={25} />
          </span>
          <strong>Chi chung, rõ ràng.</strong>
          <p>Ghi một khoản chi. Chia đúng người. Theo dõi đến khi hoàn tất.</p>
          <Link href="/">
            Về nhóm của bạn <OfficeIcon name="arrow" size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <div className="account-summary">
            <span className="account-avatar">{initials}</span>
            <div>
              <strong>{name}</strong>
              <span>Tài khoản cá nhân</span>
            </div>
          </div>
          <form action={signOut}>
            <button className="signout-button">
              <OfficeIcon name="logout" size={18} />
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <div className="workspace-label">
            <span className="workspace-dot" />
            <span>Không gian làm việc</span>
          </div>
          <Link className="mobile-brand" href="/">
            <span className="brand-mark">
              <OfficeIcon name="wallet" size={20} />
            </span>
            <strong>Chia tiền</strong>
          </Link>
          <div className="topbar-right">
            <span className="secure-label">
              <OfficeIcon name="shield" size={15} />
              Riêng tư trong nhóm
            </span>
            <Link
              className="topbar-avatar"
              href="/profile"
              aria-label="Mở hồ sơ cá nhân"
            >
              {initials}
            </Link>
            <form action={signOut} className="mobile-signout">
              <button
                type="submit"
                className="icon-button"
                aria-label="Đăng xuất"
              >
                <OfficeIcon name="logout" />
              </button>
            </form>
          </div>
        </header>
        <main className="office-page" id="main-content">
          {children}
        </main>
        <footer className="office-footer">
          <span>Ứng tiền rõ ràng · Chia sẻ nhẹ nhàng</span>
          <PolicyLinks />
        </footer>
      </div>
    </div>
  );
}
