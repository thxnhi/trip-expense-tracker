import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import ActionForm from "@/app/components/ActionForm";
import CopyButton from "@/app/components/CopyButton";
import { Heading, Empty, Badge, money } from "@/app/components/OfficeUI";
import { groupData } from "@/lib/office-data";
import { decideJoin, renameGroup, rotateInvite } from "@/lib/office-actions";
export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const data = await groupData(groupId);
  if (!data) notFound();
  const { group, user, members, requests, expenses } = data;
  const admin = group.owner_id === user.id;
  return (
    <AppShell>
      <Link href="/" className="back-link">
        ← Nhóm của bạn
      </Link>
      <Heading
        eyebrow={group.currency}
        title={group.name}
        description={`${members.length} thành viên · ${expenses.length} expense`}
      >
        <Link className="button-link" href={`/groups/${groupId}/expenses/new`}>
          + Tạo expense
        </Link>
      </Heading>
      <div className="office-grid">
        <section className="card">
          <div className="card-head">
            <h2>Chi tiêu của nhóm</h2>
            <Link href={`/statistics?group=${groupId}`}>Thống kê →</Link>
          </div>
          {expenses.length ? (
            <div className="office-list">
              {expenses.map((e) => (
                <Link
                  className="office-row"
                  key={e.id}
                  href={`/expenses/${e.id}`}
                >
                  <div className="grow">
                    <strong>{e.description}</strong>
                    <p className="muted">
                      {e.expense_date} ·{" "}
                      {members.find((m) => m.user_id === e.creator_id)?.profile
                        ?.name || "Thành viên"}{" "}
                      ứng tiền
                    </p>
                    <Badge status={e.status} />
                  </div>
                  <strong>{money(e.amount, group.currency)}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <Empty>
              Chưa có expense. Tạo khoản chi đầu tiên để bắt đầu chia tiền.
            </Empty>
          )}
        </section>
        <aside>
          <section className="card">
            <h2>Thành viên</h2>
            <div className="office-list">
              {members.map((m) => (
                <div className="office-row" key={m.user_id}>
                  <strong className="grow">
                    {m.profile?.name || "Thành viên"}
                    {m.user_id === user.id ? " (bạn)" : ""}
                  </strong>
                  <span className="badge">
                    {m.user_id === group.owner_id ? "Quản trị" : "Thành viên"}
                  </span>
                </div>
              ))}
            </div>
          </section>
          {admin && (
            <>
              <section className="card">
                <h2>Mời đồng nghiệp</h2>
                <p className="muted">
                  Thành viên mới cần bạn duyệt trước khi xem dữ liệu nhóm.
                </p>
                <p className="invite-url">/invite/{group.invite_token}</p>
                <CopyButton
                  value={`/invite/${group.invite_token}`}
                  label="Sao chép link mời"
                />
                <ActionForm
                  action={rotateInvite}
                  label="Thu hồi và tạo link mới"
                >
                  <input type="hidden" name="groupId" value={groupId} />
                </ActionForm>
              </section>
              <section className="card">
                <h2>Yêu cầu tham gia ({requests.length})</h2>
                {!requests.length && <Empty>Không có yêu cầu chờ duyệt.</Empty>}
                {requests.map((r) => (
                  <div className="request-row" key={r.id}>
                    <strong>{r.profile?.name || "Thành viên mới"}</strong>
                    <div className="inline-actions">
                      {[true, false].map((approve) => (
                        <ActionForm
                          key={String(approve)}
                          action={decideJoin}
                          label={approve ? "Duyệt" : "Từ chối"}
                          className="inline-form"
                        >
                          <input type="hidden" name="requestId" value={r.id} />
                          <input type="hidden" name="groupId" value={groupId} />
                          <input
                            type="hidden"
                            name="approve"
                            value={String(approve)}
                          />
                        </ActionForm>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
              <section className="card">
                <h2>Cài đặt nhóm</h2>
                <ActionForm action={renameGroup} label="Đổi tên">
                  <input type="hidden" name="groupId" value={groupId} />
                  <label>
                    Tên nhóm
                    <input
                      name="name"
                      defaultValue={group.name}
                      required
                      maxLength={100}
                    />
                  </label>
                </ActionForm>
              </section>
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
