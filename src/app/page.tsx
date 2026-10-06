import Link from "next/link";
import AppShell from "./components/AppShell";
import ActionForm from "./components/ActionForm";
import { Empty, Heading } from "./components/OfficeUI";
import {
  groupsForUser,
  officeContext,
  checked,
  unreadNotifications,
} from "@/lib/office-data";
import { createGroup } from "@/lib/office-actions";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { authenticatedContext } from "@/lib/supabase/server";
import { connection } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import PublicHome from "./components/PublicHome";
import OfficeIcon from "./components/OfficeIcon";
export default async function Home() {
  await connection();
  if (!supabaseConfigured()) return <PublicHome />;
  const { user: visitor } = await authenticatedContext();
  if (!visitor) return <PublicHome />;
  const { supabase, user } = await officeContext();
  const [groups, profile, count] = await Promise.all([
    groupsForUser(),
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    unreadNotifications(),
  ]);
  const name = checked(profile)?.name || user.email?.split("@")[0] || "bạn";
  return (
    <AppShell>
      <Heading
        eyebrow="Không gian chia tiền"
        title={`Xin chào, ${name}`}
        description="Theo dõi khoản đã ứng, chia tiền cùng đồng nghiệp và xác nhận từng lần chuyển."
      />
      <div className="dashboard-overview">
        <div className="overview-item">
          <span className="overview-icon">
            <OfficeIcon name="groups" size={23} />
          </span>
          <div>
            <strong>{groups.length}</strong>
            <p>Nhóm đang tham gia</p>
          </div>
        </div>
        <div className="overview-item">
          <span className="overview-icon">
            <OfficeIcon name="shield" size={23} />
          </span>
          <div>
            <strong>
              {groups.filter((g) => g.owner_id === user.id).length}
            </strong>
            <p>Nhóm bạn quản lý</p>
          </div>
        </div>
        <Link className="overview-item" href="/notifications">
          <span className="overview-icon">
            <OfficeIcon name="bell" size={23} />
          </span>
          <div>
            <strong>{count}</strong>
            <p>Thông báo chưa đọc</p>
          </div>
        </Link>
      </div>
      <div className="office-grid dashboard-grid">
        <section className="card">
          <div className="card-head">
            <h2>Nhóm của bạn</h2>
            <Link href="/notifications">{count} thông báo chưa đọc</Link>
          </div>
          {groups.length ? (
            <div className="group-grid">
              {groups.map((g) => (
                <Link
                  className="group-card"
                  key={g.id}
                  href={`/groups/${g.id}`}
                >
                  <div className="group-card-top">
                    <span className="group-icon">
                      {g.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="group-currency">{g.currency}</span>
                  </div>
                  <strong>{g.name}</strong>
                  <span className="muted">
                    {g.currency} ·{" "}
                    {g.owner_id === user.id ? "Bạn quản lý" : "Thành viên"}
                  </span>
                  <div className="group-card-footer">
                    <span>Không gian chia tiền</span> Xem nhóm{" "}
                    <OfficeIcon name="arrow" size={14} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty>
              Bạn chưa tham gia nhóm nào. Tạo nhóm mới hoặc mở link mời từ đồng
              nghiệp.
            </Empty>
          )}
        </section>
        <section className="card create-group-card">
          <div className="card-kicker">
            <span className="card-icon">
              <OfficeIcon name="plus" />
            </span>
            <h2>Tạo nhóm mới</h2>
          </div>
          <p className="muted">Một nhóm dùng một tiền tệ cố định.</p>
          <ActionForm action={createGroup} label="Tạo nhóm">
            <label>
              Tên nhóm
              <input
                name="name"
                placeholder="Ví dụ: Ăn trưa phòng Marketing"
                required
                maxLength={100}
              />
            </label>
            <label>
              Tiền tệ
              <select name="currency" defaultValue="VND">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </ActionForm>
          <div className="dashboard-note">
            <OfficeIcon name="shield" size={16} />
            <span>
              Chỉ thành viên được duyệt mới xem được các khoản chi trong nhóm
              của bạn.
            </span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
