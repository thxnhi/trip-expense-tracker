import Link from "next/link";
import Big from "big.js";
import AppShell from "@/app/components/AppShell";
import { Heading, Empty, money } from "@/app/components/OfficeUI";
import {
  officeContext,
  groupsForUser,
  collectRows,
  profilesFor,
} from "@/lib/office-data";
import { calculateStats } from "@/lib/office-stats";
import type { Expense, Share } from "@/lib/office-types";
function vietnamDate() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const v = (key: string) => p.find((x) => x.type === key)?.value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}
export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; from?: string; to?: string }>;
}) {
  const filters = await searchParams;
  const { supabase, user } = await officeContext();
  const groups = await groupsForUser();
  const chosen = filters.group
    ? groups.filter((g) => g.id === filters.group)
    : groups;
  const today = vietnamDate();
  const validDate = (d?: string) =>
    !!d &&
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime()) &&
    new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
  const from = validDate(filters.from)
    ? filters.from!
    : `${today.slice(0, 7)}-01`;
  const to = validDate(filters.to) ? filters.to! : today;
  let expenses: Expense[] = [];
  let shares: Share[] = [];
  if (chosen.length && from <= to) {
    for (let start = 0; start < chosen.length; start += 100) {
      const groupIds = chosen.slice(start, start + 100).map((g) => g.id);
      expenses.push(
        ...(await collectRows<Expense>((a, b) =>
          supabase
            .from("office_expenses")
            .select("*")
            .in("group_id", groupIds)
            .gte("expense_date", from)
            .lte("expense_date", to)
            .order("id")
            .range(a, b),
        )),
      );
    }
    for (let start = 0; start < expenses.length; start += 100) {
      const expenseIds = expenses.slice(start, start + 100).map((e) => e.id);
      shares.push(
        ...(await collectRows<Share>((a, b) =>
          supabase
            .from("office_shares")
            .select("*")
            .in("expense_id", expenseIds)
            .order("expense_id")
            .order("user_id")
            .range(a, b),
        )),
      );
    }
    expenses = expenses.map((e) => ({ ...e, amount: String(e.amount) }));
    shares = shares.map((s) => ({ ...s, amount: String(s.amount) }));
  }
  const names = await profilesFor([
    ...shares.map((s) => s.user_id),
    ...expenses.map((e) => e.creator_id),
  ]);
  const stats = calculateStats(chosen, expenses, shares, user.id);
  const cancelled = expenses.filter((e) => e.status === "cancelled");
  return (
    <AppShell>
      <Heading
        title="Thống kê"
        description="Khoản chờ xác nhận vẫn tính là còn thiếu. Các tiền tệ được thống kê riêng."
      />
      <form className="card filter-form" method="get">
        <label>
          Nhóm
          <select name="group" defaultValue={filters.group || ""}>
            <option value="">Tất cả nhóm</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.currency})
              </option>
            ))}
          </select>
        </label>
        <label>
          Từ ngày
          <input type="date" name="from" defaultValue={from} required />
        </label>
        <label>
          Đến ngày
          <input type="date" name="to" defaultValue={to} required />
        </label>
        <button>Lọc</button>
      </form>
      {from > to && (
        <p role="alert" className="form-error">
          Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
        </p>
      )}
      {!stats.length && <Empty>Chưa có nhóm để thống kê.</Empty>}
      {stats.map((s) => (
        <section key={s.currency} className="stats-section">
          <h2>{s.currency}</h2>
          <div className="metric-grid">
            {[
              ["Tổng chi", s.totals.spent],
              ["Cần thu từ thành viên", s.totals.toCollect],
              ["Đã xác nhận thu", s.totals.received],
              ["Chờ xác nhận", s.totals.reported],
              ["Còn thiếu (gồm chờ xác nhận)", s.totals.outstanding],
            ].map(([label, amount]) => (
              <div className="metric" key={label}>
                <span>{label}</span>
                <strong>{money(amount, s.currency)}</strong>
              </div>
            ))}
            <div className="metric">
              <span>Expense hoàn tất</span>
              <strong>{s.totals.completed}</strong>
            </div>
          </div>
          <div className="office-grid">
            <section className="card">
              <h3>Chi tiêu theo tháng</h3>
              {!s.months.length ? (
                <Empty>Không có chi tiêu trong khoảng ngày này.</Empty>
              ) : (
                <div className="bar-chart">
                  {s.months.map((m) => {
                    const max = s.months.reduce(
                      (v, x) =>
                        new Big(x.amount).gt(v) ? new Big(x.amount) : v,
                      new Big(0),
                    );
                    const width = max.eq(0)
                      ? 0
                      : new Big(m.amount).div(max).times(100).toNumber();
                    return (
                      <div className="bar-row" key={m.month}>
                        <span>{m.month}</span>
                        <div className="bar-track">
                          <div className="bar" style={{ width: `${width}%` }} />
                        </div>
                        <strong>{money(m.amount, s.currency)}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            <section className="card">
              <h3>Cá nhân bạn</h3>
              <dl className="personal-stats">
                {[
                  ["Đã ứng", s.totals.advanced],
                  ["Phần chi tiêu", s.totals.personalShare],
                  ["Đã hoàn trả", s.totals.repaid],
                  ["Còn phải trả", s.totals.toPay],
                  ["Còn phải thu", s.totals.toReceive],
                ].map(([label, amount]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{money(amount, s.currency)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
          <section className="card">
            <h3>Theo thành viên</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Thành viên</th>
                    <th>Đã ứng</th>
                    <th>Phần chi</th>
                    <th>Đã trả</th>
                    <th>Còn trả</th>
                    <th>Còn thu</th>
                  </tr>
                </thead>
                <tbody>
                  {s.people.map((p) => (
                    <tr key={p.userId}>
                      <td>{names.get(p.userId)?.name || "Thành viên"}</td>
                      {[
                        p.advanced,
                        p.share,
                        p.repaid,
                        p.toPay,
                        p.toReceive,
                      ].map((v, i) => (
                        <td key={i}>{money(v, s.currency)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Không bù trừ số phải trả và phải thu giữa các expense.
            </p>
          </section>
          <div className="notice">
            Tiền đã xác nhận trong expense hủy cần đối soát:{" "}
            {money(s.totals.cancelledReceived, s.currency)}
          </div>
        </section>
      ))}
      <section className="card">
        <h2>Expense đã hủy</h2>
        {!cancelled.length ? (
          <Empty>Không có expense hủy trong khoảng ngày này.</Empty>
        ) : (
          cancelled.map((e) => (
            <Link className="office-row" href={`/expenses/${e.id}`} key={e.id}>
              <div className="grow">
                <strong>{e.description}</strong>
                <p className="muted">
                  {e.expense_date} · {e.cancel_reason}
                </p>
              </div>
              <span>Xem đối soát →</span>
            </Link>
          ))
        )}
      </section>
    </AppShell>
  );
}
