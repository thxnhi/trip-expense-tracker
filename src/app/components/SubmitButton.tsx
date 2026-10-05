"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// A form submit button that disables itself and swaps its label while the
// surrounding form's action is pending. Reads the pending state from the
// enclosing <form> via useFormStatus, so callers don't thread it through
// (every form in the app repeated this same pattern).
export default function SubmitButton({
  label,
  pendingLabel,
  className,
  disabled = false,
}: {
  label: ReactNode;
  /** Shown while the form action is in flight, e.g. "Saving…". */
  pendingLabel: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendingLabel : label}
    </button>
  );
}
