"use client";
/* eslint-disable @next/next/no-img-element -- Private signed URLs expire and must bypass public image optimization. */
import { useEffect, useState } from "react";
export default function SavedImage({
  uploadId,
  alt,
  className,
}: {
  uploadId: string;
  alt: string;
  className?: string;
}) {
  const [image, setImage] = useState<{
    id: string;
    url: string;
    error: string;
  }>({ id: "", url: "", error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          `/api/uploads/${encodeURIComponent(uploadId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Không đọc được ảnh.");
        if (active) setImage({ id: uploadId, url: result.url, error: "" });
      } catch (error) {
        if (active)
          setImage({
            id: uploadId,
            url: "",
            error:
              error instanceof Error ? error.message : "Không đọc được ảnh.",
          });
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [uploadId, retry]);
  const current =
    image.id === uploadId ? image : { id: uploadId, url: "", error: "" };
  if (current.error)
    return (
      <div>
        <p role="alert" className="form-error">
          {current.error}
        </p>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setImage({ id: uploadId, url: "", error: "" });
            setRetry((n) => n + 1);
          }}
        >
          Tải lại ảnh
        </button>
      </div>
    );
  if (!current.url) return <p className="muted">Đang tải ảnh…</p>;
  return (
    <img
      src={current.url}
      alt={alt}
      className={className}
      onError={() =>
        setImage({
          ...current,
          error: "Ảnh đã hết hạn hoặc không tải được. Vui lòng tải lại.",
        })
      }
      style={{
        maxWidth: "100%",
        maxHeight: 400,
        objectFit: "contain",
        borderRadius: 12,
      }}
    />
  );
}
