import Link from "next/link";
import { notFound } from "next/navigation";
import Big from "big.js";
import AppShell from "@/app/components/AppShell";
import ActionForm from "@/app/components/ActionForm";
import CopyButton from "@/app/components/CopyButton";
import SavedImage from "@/app/components/SavedImage";
import { Heading, Badge, Empty, money } from "@/app/components/OfficeUI";
import { expenseData, checked, collectRows } from "@/lib/office-data";
import { paymentAction, cancelExpense } from "@/lib/office-actions";
import type { BankAccount } from "@/lib/office-types";
const eventLabels: Record<string, string> = {
  report: "Báo đã chuyển",
  confirm: "Xác nhận đã nhận",
  reject: "Từ chối báo chuyển",
  cancel: "Hủy expense",
  create: "Tạo expense",
  update: "Cập nhật expense",
};
export default async function ExpensePage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  const data = await expenseData(expenseId);
  if (!data) notFound();
  const { user, supabase, expense, group, shares, names } = data;
  const creator = expense.creator_id === user.id;
  const [bankResult, events] = await Promise.all([
    supabase
      .from("bank_profiles")
      .select("*")
      .eq("user_id", expense.creator_id)
      .maybeSingle(),
    collectRows<{
      id: string;
      user_id: string;
      actor_id: string;
      action: string;
      created_at: string;
    }>((a, b) =>
      supabase
        .from("payment_events")
        .select("*")
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(a, b),
    ),
  ]);
  const bank = checked(bankResult) as BankAccount | null;
  const required = shares.filter(
    (s) => s.payment_status !== "self" && new Big(s.amount).gt(0),
  );
  const confirmed = required.filter((s) => s.payment_status === "confirmed");
  const received = confirmed.reduce((sum, s) => sum.plus(s.amount), new Big(0));
  return (
    <AppShell>
      <Link href={`/groups/${group.id}`} className="back-link">
        ← {group.name}
      </Link>
      <Heading
        eyebrow={`${expense.expense_date} · ${names.get(expense.creator_id)?.name || "Thành viên"} ứng tiền`}
        title={expense.description}
      >
        <div className="heading-amount">
          <strong>{money(expense.amount, group.currency)}</strong>
          <Badge status={expense.status} />
        </div>
      </Heading>
      {expense.status === "cancelled" && (
        <div className="notice">
          Đã hủy: {expense.cancel_reason}. Tiền đã xác nhận{" "}
          {money(received.toString(), group.currency)} cần được đối soát hoặc
          hoàn trả bên ngoài app.
        </div>
      )}
      <div className="office-grid">
        <div>
          <section className="card">
            <div className="card-head">
              <h2>Phần chia và thanh toán</h2>
              {creator && expense.status !== "cancelled" && (
                <Link href={`/expenses/${expense.id}/edit`}>Chỉnh sửa</Link>
              )}
            </div>
            <p className="muted">
              {confirmed.length}/{required.length} người cần chuyển đã xác nhận
              · Đã nhận {money(received.toString(), group.currency)}
            </p>
            <progress
              max={Math.max(required.length, 1)}
              value={
                expense.status === "completed"
                  ? Math.max(required.length, 1)
                  : confirmed.length
              }
              aria-label="Tiến độ thanh toán"
            />
            {shares.map((s) => (
              <div className="payment-row" key={s.user_id}>
                <div className="office-row">
                  <div className="grow">
                    <strong>
                      {names.get(s.user_id)?.name || "Thành viên"}
                      {s.user_id === user.id ? " (bạn)" : ""}
                    </strong>
                    <p>
                      <Badge status={s.payment_status} />
                    </p>
                  </div>
                  <strong>{money(s.amount, group.currency)}</strong>
                </div>
                {expense.status === "active" && (
                  <div className="inline-actions">
                    {s.user_id === user.id &&
                      s.payment_status === "pending" && (
                        <ActionForm
                          action={paymentAction}
                          label="Tôi đã chuyển tiền"
                          className="inline-form"
                        >
                          <input
                            type="hidden"
                            name="expenseId"
                            value={expense.id}
                          />
                          <input
                            type="hidden"
                            name="groupId"
                            value={group.id}
                          />
                          <input
                            type="hidden"
                            name="userId"
                            value={s.user_id}
                          />
                          <input
                            type="hidden"
                            name="operation"
                            value="report"
                          />
                        </ActionForm>
                      )}
                    {creator &&
                      s.payment_status === "reported" &&
                      ["confirm", "reject"].map((operation) => (
                        <ActionForm
                          key={operation}
                          action={paymentAction}
                          label={
                            operation === "confirm"
                              ? "Xác nhận đã nhận"
                              : "Chưa nhận / từ chối"
                          }
                          className="inline-form"
                        >
                          <input
                            type="hidden"
                            name="expenseId"
                            value={expense.id}
                          />
                          <input
                            type="hidden"
                            name="groupId"
                            value={group.id}
                          />
                          <input
                            type="hidden"
                            name="userId"
                            value={s.user_id}
                          />
                          <input
                            type="hidden"
                            name="operation"
                            value={operation}
                          />
                        </ActionForm>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Lịch sử</h2>
            {events.length ? (
              <ol className="timeline">
                {events.map((event, index) => (
                  <li key={event.id || index}>
                    <strong>{eventLabels[event.action] || event.action}</strong>
                    <p className="muted">
                      {names.get(event.actor_id)?.name || "Thành viên"}
                      {event.user_id && event.user_id !== event.actor_id
                        ? ` · ${names.get(event.user_id)?.name || "Thành viên"}`
                        : ""}{" "}
                      ·{" "}
                      {new Date(event.created_at).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>Chưa có thao tác thanh toán.</Empty>
            )}
          </section>
        </div>
        <aside>
          <section className="card">
            <h2>Chuyển cho người ứng tiền</h2>
            {bank ? (
              <>
                <dl className="bank-details">
                  <dt>Ngân hàng</dt>
                  <dd>{bank.bank_name}</dd>
                  <dt>Chủ tài khoản</dt>
                  <dd>{bank.account_holder}</dd>
                  <dt>Số tài khoản</dt>
                  <dd>
                    {bank.account_number}{" "}
                    <CopyButton value={bank.account_number} />
                  </dd>
                  <dt>Nội dung chuyển khoản</dt>
                  <dd>
                    {bank.transfer_template || expense.description}{" "}
                    <CopyButton
                      value={bank.transfer_template || expense.description}
                    />
                  </dd>
                </dl>
                {bank.qr_upload_id && (
                  <SavedImage
                    className="qr-image"
                    uploadId={bank.qr_upload_id}
                    alt="Mã QR ngân hàng người ứng tiền"
                  />
                )}
              </>
            ) : (
              <p className="muted">
                Người ứng tiền chưa thêm thông tin ngân hàng. Hãy liên hệ trực
                tiếp để chuyển tiền.
              </p>
            )}
            <p className="muted">
              Sau khi chuyển, đánh dấu phần của bạn là đã chuyển để người ứng
              tiền xác nhận.
            </p>
          </section>
          {expense.receipt_upload_id && (
            <section className="card">
              <h2>Hóa đơn đính kèm</h2>
              <SavedImage
                className="receipt-image"
                uploadId={expense.receipt_upload_id}
                alt="Hóa đơn đính kèm"
              />
            </section>
          )}
          {creator && expense.status !== "cancelled" && (
            <details className="card">
              <summary>Hủy expense</summary>
              <p className="muted">
                Lịch sử và tiền đã xác nhận được giữ lại để đối soát. Hoàn tiền
                bên ngoài app.
              </p>
              <ActionForm action={cancelExpense} label="Hủy expense">
                <input type="hidden" name="expenseId" value={expense.id} />
                <input type="hidden" name="groupId" value={group.id} />
                <label>
                  Lý do hủy
                  <input name="reason" required maxLength={500} />
                </label>
              </ActionForm>
            </details>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
