"use client";
import { useState } from "react";
export default function CopyButton({
  value,
  label = "Sao chép",
}: {
  value: string;
  label?: string;
}) {
  const [message, setMessage] = useState("");
  return (
    <span className="copy-control">
      <button
        type="button"
        className="secondary btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              value.startsWith("/") ? `${location.origin}${value}` : value,
            );
            setMessage("Đã sao chép");
          } catch {
            setMessage("Không thể sao chép, vui lòng chọn nội dung.");
          }
        }}
      >
        {label}
      </button>
      <span role="status" className="muted">
        {message}
      </span>
    </span>
  );
}
