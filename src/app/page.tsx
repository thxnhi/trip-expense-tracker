import Link from "next/link";
import AppShell from "./components/AppShell";
import ActionForm from "./components/ActionForm";
import { Empty, Heading } from "./components/OfficeUI";
import { groupsForUser, officeContext, checked } from "@/lib/office-data";
import { createGroup } from "@/lib/office-actions";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
export default async function Home() {
  const { supabase, user } = await officeContext();
  const [groups, profile, count] = await Promise.all([
    groupsForUser(),
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);
  const name = checked(profile)?.name || user.email?.split("@")[0] || "bạn";
  return (
    <AppShell>
      <Heading
        eyebrow="Không gian chia tiền"
        title={`Xin chào, ${name}`}
        description="Theo dõi khoản đã ứng, chia tiền cùng đồng nghiệp và xác nhận từng lần chuyển."
      />
      <div className="office-grid">
        <section className="card">
          <div className="card-head">
            <h2>Nhóm của bạn</h2>
            <Link href="/notifications">
              {count.count || 0} thông báo chưa đọc
            </Link>
          </div>
          {groups.length ? (
            <div className="group-grid">
              {groups.map((g) => (
                <Link
                  className="group-card"
                  key={g.id}
                  href={`/groups/${g.id}`}
                >
                  <span className="group-icon">
                    {g.name.charAt(0).toUpperCase()}
                  </span>
                  <strong>{g.name}</strong>
                  <span className="muted">
                    {g.currency} ·{" "}
                    {g.owner_id === user.id ? "Bạn quản lý" : "Thành viên"}
                  </span>
                  <span>Xem nhóm →</span>
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
        <section className="card">
          <h2>Tạo nhóm mới</h2>
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
        </section>
      </div>
    </AppShell>
  );
}
