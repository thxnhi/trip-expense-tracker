import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import ActionForm from "@/app/components/ActionForm";
import { Heading, Empty } from "@/app/components/OfficeUI";
import { officeContext, checked } from "@/lib/office-data";
import { readNotification } from "@/lib/office-actions";
export default async function NotificationsPage() {
  const { supabase } = await officeContext();
  const rows = checked(
    await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ) as {
    id: string;
    title: string;
    group_id: string | null;
    expense_id: string | null;
    created_at: string;
    read_at: string | null;
  }[];
  return (
    <AppShell>
      <Heading
        title="Thông báo"
        description={`${rows.filter((r) => !r.read_at).length} thông báo chưa đọc trong 100 thông báo gần nhất`}
      >
        <ActionForm
          action={readNotification}
          label="Đánh dấu tất cả đã đọc"
          className="inline-form"
        />
      </Heading>
      <section className="card">
        {!rows.length ? (
          <Empty>Bạn chưa có thông báo.</Empty>
        ) : (
          <div className="office-list">
            {rows.map((r) => (
              <article
                className={`office-row ${!r.read_at ? "unread" : ""}`}
                key={r.id}
              >
                <div className="grow">
                  <strong>{r.title}</strong>
                  <p className="muted">
                    {new Date(r.created_at).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </p>
                  {(r.expense_id || r.group_id) && (
                    <Link
                      href={
                        r.expense_id
                          ? `/expenses/${r.expense_id}`
                          : `/groups/${r.group_id}`
                      }
                    >
                      Xem chi tiết →
                    </Link>
                  )}
                </div>
                {!r.read_at && (
                  <ActionForm
                    action={readNotification}
                    label="Đã đọc"
                    className="inline-form"
                  >
                    <input type="hidden" name="notificationId" value={r.id} />
                  </ActionForm>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
