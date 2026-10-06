import type { ReactNode } from "react";
import Big from "big.js";
import { formatAmount, type CurrencyCode } from "@/lib/currency";
import OfficeIcon from "./OfficeIcon";
export const money = (value: string, currency: string) =>
  formatAmount(new Big(value), currency as CurrencyCode);
export const statusText = (status: string) =>
  ({
    active: "Đang thu",
    collecting: "Đang thu",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
    unpaid: "Chưa trả",
    reported: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    self: "Không cần chuyển",
    exempt: "Không cần chuyển",
    pending: "Chưa trả",
    approved: "Đã tham gia",
    rejected: "Đã từ chối",
  })[status] || status;
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {statusText(status)}
    </span>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="office-heading">
      <div className="heading-copy">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <OfficeIcon name="receipt" size={28} />
      </span>
      <p>{children}</p>
    </div>
  );
}
