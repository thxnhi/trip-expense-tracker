import { requireUser } from "@/lib/supabase/server";
import PasswordForm from "./PasswordForm";

export default async function ResetPassword() {
  await requireUser("/reset-password");
  return (
    <main className="page">
      <section className="card">
        <h1>Đặt lại mật khẩu</h1>
        <PasswordForm />
      </section>
    </main>
  );
}
