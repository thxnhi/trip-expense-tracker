"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OfficeIcon, { type OfficeIconName } from "./OfficeIcon";
const items: { href: string; label: string; icon: OfficeIconName }[] = [
  { href: "/", label: "Nhóm", icon: "groups" },
  { href: "/statistics", label: "Thống kê", icon: "chart" },
  { href: "/notifications", label: "Thông báo", icon: "bell" },
  { href: "/profile", label: "Hồ sơ", icon: "user" },
];
export default function AppNavigation({ count }: { count: number }) {
  const pathname = usePathname();
  return (
    <nav className="app-navigation" aria-label="Điều hướng chính">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/" ||
              /^\/(groups|expenses|invite)(\/|$)/.test(pathname)
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <OfficeIcon name={item.icon} />
            <span>{item.label}</span>
            {item.href === "/notifications" && count > 0 && (
              <span className="nav-count" aria-label={`${count} chưa đọc`}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
