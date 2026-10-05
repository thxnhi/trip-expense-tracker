"use client";
import { useState } from "react";
import ImageUpload from "./ImageUpload";
import SavedImage from "./SavedImage";
import ActionForm from "./ActionForm";
import { saveBank } from "@/lib/office-actions";
import type { BankAccount } from "@/lib/office-types";
export default function BankEditor({ bank }: { bank: BankAccount | null }) {
  const [qr, setQr] = useState(bank?.qr_upload_id || "");
  const [uploadBusy, setUploadBusy] = useState(false);
  return (
    <>
      <ActionForm
        action={saveBank}
        label="Lưu ngân hàng"
        submitDisabled={uploadBusy}
      >
        <label>
          Ngân hàng
          <input
            name="bankName"
            defaultValue={bank?.bank_name || ""}
            required
            maxLength={100}
          />
        </label>
        <label>
          Số tài khoản
          <input
            name="accountNumber"
            inputMode="numeric"
            defaultValue={bank?.account_number || ""}
            required
            maxLength={50}
          />
        </label>
        <label>
          Tên chủ tài khoản
          <input
            name="accountHolder"
            defaultValue={bank?.account_holder || ""}
            required
            maxLength={150}
          />
        </label>
        <label>
          Nội dung chuyển khoản mặc định
          <input
            name="transferTemplate"
            defaultValue={bank?.transfer_template || ""}
            placeholder="Ví dụ: Nguyen Van A thanh toan"
            maxLength={200}
          />
        </label>
        <input type="hidden" name="qrUploadId" value={qr} />
        <div className="qr-upload">
          <h3>QR ngân hàng</h3>
          {qr && (
            <>
              <SavedImage
                className="qr-image"
                uploadId={qr}
                alt="QR ngân hàng của bạn"
              />
              <button
                type="button"
                className="secondary"
                disabled={uploadBusy}
                onClick={() => setQr("")}
              >
                Gỡ QR
              </button>
            </>
          )}
          <ImageUpload
            kind="qr"
            onBusyChange={setUploadBusy}
            onUploaded={(v) => setQr(v.id)}
          />
        </div>
      </ActionForm>
    </>
  );
}
