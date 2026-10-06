"use client";
import { useActionState, type ReactNode } from "react";
import SubmitButton from "./SubmitButton";
import type { OfficeState } from "@/lib/office-types";
export default function ActionForm({
  action,
  children,
  label = "Lưu",
  className = "office-form",
  submitDisabled = false,
}: {
  action: (state: OfficeState, form: FormData) => Promise<OfficeState>;
  children?: ReactNode;
  label?: string;
  className?: string;
  submitDisabled?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (submitDisabled) event.preventDefault();
      }}
    >
      {children}
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="toast">
          {state.success}
        </p>
      )}
      <SubmitButton
        label={label}
        pendingLabel="Đang xử lý…"
        disabled={submitDisabled}
      />
    </form>
  );
}
