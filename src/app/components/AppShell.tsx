import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { requireUser } from "@/lib/supabase/server";
export default async function AppShell({ children }: { children: ReactNode }) {
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return (
    <>
      <header className="office-header">
        <Link className="brand" href="/">
          Chia tiền <span>văn phòng</span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <Link href="/">Nhóm</Link>
          <Link href="/statistics">Thống kê</Link>
          <Link href="/notifications">
            Thông báo{count ? ` (${count})` : ""}
          </Link>
          <Link href="/profile">Hồ sơ</Link>
          <form action={signOut}>
            <button className="link-btn">Đăng xuất</button>
          </form>
        </nav>
      </header>
      <main className="office-page">{children}</main>
      <footer className="office-footer">
        Ứng tiền rõ ràng · Chia sẻ nhẹ nhàng
      </footer>
    </>
  );
}
