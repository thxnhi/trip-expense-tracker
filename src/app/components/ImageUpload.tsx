"use client";
/* eslint-disable @next/next/no-img-element -- Local object URLs display private camera previews without an image proxy. */

import { useEffect, useRef, useState } from "react";
import { Upload } from "tus-js-client";

export type UploadedImage = { id: string; previewUrl?: string };
type Props = {
  groupId?: string;
  kind: "receipt" | "qr";
  onUploaded: (image: UploadedImage) => void;
  onBusyChange?: (busy: boolean) => void;
};

async function prepareImage(file: File, kind: "receipt" | "qr"): Promise<Blob> {
  const limit = (kind === "qr" ? 5 : 15) * 1024 * 1024;
  if (!file.size || file.size > limit)
    throw new Error(`Hãy chọn ảnh không quá ${kind === "qr" ? 5 : 15} MB.`);
  let source: Blob = file;
  const heic =
    /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
  if (heic) {
    try {
      const { default: convert } = await import("heic2any");
      const converted = await convert({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      source = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      throw new Error(
        "Không chuyển được ảnh HEIC. Vui lòng chọn JPEG/PNG hoặc bật định dạng tương thích trên camera.",
      );
    }
  } else if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Hãy chọn ảnh JPEG, PNG, WebP hoặc HEIC.");
  }
  const url = URL.createObjectURL(source);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("Không mở được ảnh. Vui lòng chọn ảnh khác."));
      img.src = url;
    });
    if (image.naturalWidth * image.naturalHeight > 50_000_000)
      throw new Error("Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 50 megapixel.");
    const scale = Math.min(
      1,
      2400 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Trình duyệt không xử lý được ảnh. Vui lòng thử trình duyệt khác.",
      );
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Không xử lý được ảnh.")),
        "image/jpeg",
        0.9,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Không tải được ảnh. Vui lòng thử lại.");
  return data as T;
}

export default function ImageUpload({
  groupId,
  kind,
  onUploaded,
  onBusyChange,
}: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const task = useRef<Upload | null>(null);
  const alive = useRef(true);
  const currentPreview = useRef("");
  const previewUrls = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    alive.current = true;
    const urls = previewUrls.current;
    return () => {
      alive.current = false;
      void task.current?.abort();
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setProgress(0);
    setStep("Đang xử lý ảnh…");
    let candidateUrl: string | null = null;
    try {
      const image = await prepareImage(file, kind);
      if (!alive.current) return;
      candidateUrl = URL.createObjectURL(image);
      previewUrls.current.add(candidateUrl);
      setPreview(candidateUrl);
      const target = await post<{
        id: string;
        path: string;
        token: string;
        bucket: string;
        endpoint: string;
      }>("/api/uploads", {
        groupId,
        kind,
        contentType: image.type,
        size: image.size,
      });
      if (!alive.current) return;
      setStep("Đang tải ảnh…");
      await new Promise<void>((resolve, reject) => {
        task.current = new Upload(image, {
          endpoint: target.endpoint,
          headers: { "x-signature": target.token },
          retryDelays: [0, 1000, 3000, 5000, 10000],
          chunkSize: 6 * 1024 * 1024,
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          fingerprint: async () => `office-${target.id}`,
          metadata: {
            bucketName: target.bucket,
            objectName: target.path,
            contentType: image.type,
            cacheControl: "300",
          },
          onProgress: (sent, total) => {
            if (alive.current) setProgress(Math.round((sent / total) * 100));
          },
          onError: () =>
            reject(
              new Error(
                "Tải ảnh bị gián đoạn. Kiểm tra kết nối rồi chọn lại ảnh.",
              ),
            ),
          onSuccess: () => resolve(),
        });
        task.current.start();
      });
      if (!alive.current) return;
      setStep("Đang kiểm tra ảnh…");
      const result = await post<UploadedImage>("/api/uploads/complete", {
        uploadId: target.id,
      });
      if (!alive.current) return;
      setStep("Ảnh đã tải xong.");
      onUploaded(result);
      if (currentPreview.current) {
        URL.revokeObjectURL(currentPreview.current);
        previewUrls.current.delete(currentPreview.current);
      }
      currentPreview.current = candidateUrl;
    } catch (err) {
      if (candidateUrl) {
        URL.revokeObjectURL(candidateUrl);
        previewUrls.current.delete(candidateUrl);
      }
      if (alive.current) {
        setPreview(currentPreview.current);
        setError(err instanceof Error ? err.message : "Không tải được ảnh.");
        setStep("");
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="image-upload">
      <div
        className="button-row"
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        {kind === "receipt" && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => camera.current?.click()}
          >
            Chụp hóa đơn
          </button>
        )}
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => picker.current?.click()}
        >
          {preview
            ? "Đổi ảnh"
            : kind === "qr"
              ? "Chọn ảnh QR ngân hàng"
              : "Chọn ảnh"}
        </button>
      </div>
      <input
        ref={camera}
        hidden
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={picker}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {preview && (
        /* Local object URL; no public image optimization service. */ <img
          src={preview}
          alt={kind === "qr" ? "Ảnh QR đã chọn" : "Ảnh hóa đơn đã chọn"}
          style={{
            maxWidth: "100%",
            maxHeight: 280,
            objectFit: "contain",
            borderRadius: 12,
            marginTop: 12,
          }}
        />
      )}
      {busy && (
        <progress
          aria-label="Tiến độ tải ảnh"
          max={100}
          value={progress}
          style={{ display: "block", width: "100%", marginTop: 8 }}
        />
      )}
      {step && (
        <p aria-live="polite" className="muted">
          {step}
          {busy && progress > 0 ? ` ${progress}%` : ""}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p className="muted">
        JPEG, PNG, WebP hoặc HEIC · tối đa {kind === "qr" ? 5 : 15} MB.
      </p>
    </div>
  );
}
