import AppShell from "@/app/components/AppShell";
import ActionForm from "@/app/components/ActionForm";
import BankEditor from "@/app/components/BankEditor";
import { Heading } from "@/app/components/OfficeUI";
import { officeContext, checked } from "@/lib/office-data";
import { saveProfile } from "@/lib/office-actions";
import type { BankAccount } from "@/lib/office-types";
export default async function ProfilePage() {
  const { supabase, user } = await officeContext();
  const [profile, bank] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase
      .from("bank_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  return (
    <AppShell>
      <Heading
        title="Hồ sơ của bạn"
        description="Thông tin ngân hàng giúp đồng nghiệp chuyển lại khoản bạn đã ứng."
      />
      <div className="office-grid">
        <section className="card">
          <h2>Tài khoản</h2>
          <p className="muted">{user.email}</p>
          <ActionForm action={saveProfile} label="Lưu tên">
            <label>
              Tên hiển thị
              <input
                name="name"
                defaultValue={checked(profile)?.name || ""}
                required
                maxLength={100}
              />
            </label>
          </ActionForm>
        </section>
        <section className="card">
          <h2>Tài khoản ngân hàng</h2>
          <p className="muted">
            Thành viên trong nhóm có expense do bạn tạo được xem thông tin
            chuyển khoản của bạn.
          </p>
          <BankEditor bank={checked(bank) as BankAccount | null} />
        </section>
      </div>
    </AppShell>
  );
}
