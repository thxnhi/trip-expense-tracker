import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import ActionForm from "@/app/components/ActionForm";
import { Heading } from "@/app/components/OfficeUI";
import { officeContext } from "@/lib/office-data";
import { requestJoin } from "@/lib/office-actions";
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { supabase } = await officeContext(`/invite/${token}`);
  const result = await supabase.rpc("invite_info", { p_token: token });
  const info = (result.error ? null : result.data) as {
    group_id: string;
    name: string;
    status: string;
  } | null;
  return (
    <AppShell>
      <section className="card narrow">
        {!info ? (
          <>
            <Heading
              title="Link mời không còn hiệu lực"
              description="Hãy nhờ quản trị viên gửi link mời mới."
            />
            <Link href="/">Về danh sách nhóm</Link>
          </>
        ) : (
          <>
            <Heading eyebrow="Lời mời tham gia" title={info.name} />
            {info.status === "approved" ? (
              <Link className="button-link" href={`/groups/${info.group_id}`}>
                Mở nhóm
              </Link>
            ) : info.status === "pending" ? (
              <>
                <span className="badge">Chờ duyệt</span>
                <p className="muted">
                  Bạn sẽ xem được dữ liệu nhóm sau khi quản trị viên duyệt.
                </p>
              </>
            ) : (
              <>
                <p className="muted">
                  Gửi yêu cầu tham gia nhóm để quản trị viên duyệt.
                </p>
                <ActionForm action={requestJoin} label="Xin tham gia nhóm">
                  <input type="hidden" name="token" value={token} />
                </ActionForm>
              </>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}
