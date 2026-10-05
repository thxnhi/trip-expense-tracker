"use client";
import { useActionState, useState } from "react";
import { authenticate, googleSignIn } from "@/app/auth/actions";
import SubmitButton from "@/app/components/SubmitButton";

export default function AuthForm({
  next,
  initialError,
  message,
}: {
  next: string;
  initialError?: string;
  message?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  return (
    <>
      <div className="seg" aria-label="Tài khoản">
        <button
          type="button"
          className={`seg-btn ${mode === "signin" ? "active" : ""}`}
          onClick={() => setMode("signin")}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          className={`seg-btn ${mode === "signup" ? "active" : ""}`}
          onClick={() => setMode("signup")}
        >
          Đăng ký
        </button>
      </div>
      <CredentialsForm
        key={mode}
        mode={mode}
        next={next}
        initialError={initialError}
        message={mode === "signin" ? message : undefined}
      />
      <button
        type="button"
        className="seg-btn"
        onClick={() => setMode(mode === "forgot" ? "signin" : "forgot")}
      >
        {mode === "forgot" ? "Quay lại đăng nhập" : "Quên mật khẩu?"}
      </button>
      {mode !== "forgot" && (
        <form action={googleSignIn} className="auth-form">
          <input type="hidden" name="next" value={next} />
          <SubmitButton
            label="Tiếp tục với Google"
            pendingLabel="Đang kết nối…"
          />
        </form>
      )}
    </>
  );
}

function CredentialsForm({
  mode,
  next,
  initialError,
  message,
}: {
  mode: "signin" | "signup" | "forgot";
  next: string;
  initialError?: string;
  message?: string;
}) {
  const [state, action] = useActionState(authenticate, {});
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <label>
          Tên hiển thị
          <input name="name" required maxLength={100} autoComplete="name" />
        </label>
      )}
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" />
      </label>
      {mode !== "forgot" && (
        <label>
          Mật khẩu
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
          />
        </label>
      )}
      {(state.error || initialError) && (
        <p className="form-error" role="alert">
          {state.error || initialError}
        </p>
      )}
      {(state.message || message) && (
        <p className="form-success" role="status">
          {state.message || message}
        </p>
      )}
      <SubmitButton
        label={
          mode === "forgot"
            ? "Gửi liên kết khôi phục"
            : mode === "signup"
              ? "Tạo tài khoản"
              : "Đăng nhập"
        }
        pendingLabel="Đang xử lý…"
      />
    </form>
  );
}
