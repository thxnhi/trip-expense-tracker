"use client";
import { useActionState } from "react";
import { changePassword } from "@/app/auth/actions";
import SubmitButton from "@/app/components/SubmitButton";

export default function PasswordForm() {
  const [state, action] = useActionState(changePassword, {});
  return (
    <form action={action} className="auth-form">
      <label>
        Mật khẩu mới
        <input
          type="password"
          name="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label>
        Nhập lại mật khẩu
        <input
          type="password"
          name="confirmation"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton label="Đổi mật khẩu" pendingLabel="Đang lưu…" />
    </form>
  );
}
