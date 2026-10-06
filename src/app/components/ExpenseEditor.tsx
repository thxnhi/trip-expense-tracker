"use client";
import { useActionState, useId, useState } from "react";
import Big from "big.js";
import type { Expense, Member, OfficeState, Share } from "@/lib/office-types";
import { saveExpense } from "@/lib/office-actions";
import { decimalPlaces, formatAmount, type CurrencyCode } from "@/lib/currency";
import { moneyInputError, moneyInputPattern } from "@/lib/money-input";
import SubmitButton from "./SubmitButton";
import ReceiptScanner from "./ReceiptScanner";
import SavedImage from "./SavedImage";
export default function ExpenseEditor({
  groupId,
  currency,
  members,
  expense,
  shares = [],
}: {
  groupId: string;
  currency: string;
  members: Member[];
  expense?: Expense;
  shares?: Share[];
}) {
  const [state, action] = useActionState<OfficeState, FormData>(
    saveExpense,
    {},
  );
  const [amount, setAmount] = useState(expense?.amount || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [date, setDate] = useState(
    expense?.expense_date ||
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
  );
  const [upload, setUpload] = useState(expense?.receipt_upload_id || "");
  const [selected, setSelected] = useState<string[]>(
    expense ? shares.map((s) => s.user_id) : members.map((m) => m.user_id),
  );
  const [mode, setMode] = useState(expense ? "custom" : "even");
  const [custom, setCustom] = useState<Record<string, string>>(
    Object.fromEntries(shares.map((s) => [s.user_id, s.amount])),
  );
  const [scan, setScan] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const dp = decimalPlaces(currency as CurrencyCode);
  const moneyId = useId();
  const amountError = moneyInputError(amount, dp);
  const customError =
    mode === "custom"
      ? selected
          .map((id) => moneyInputError(custom[id] || "", dp, true))
          .find(Boolean)
      : undefined;
  let remaining = "";
  try {
    remaining = new Big(amount || 0)
      .minus(
        selected.reduce((sum, id) => sum.plus(custom[id] || 0), new Big(0)),
      )
      .toString();
  } catch {
    remaining = "—";
  }
  return (
    <section className="card">
      <div className="inline-actions">
        <button
          type="button"
          className="secondary"
          disabled={mediaBusy}
          onClick={() => setScan(!scan)}
        >
          {scan ? "Ẩn quét hóa đơn" : "Chụp / quét hóa đơn"}
        </button>
      </div>
      {scan && (
        <ReceiptScanner
          groupId={groupId}
          onBusyChange={setMediaBusy}
          onScanned={(v) => {
            setUpload(v.uploadId);
            if (v.amount) setAmount(v.amount);
            if (v.description) setDescription(v.description);
            if (v.expenseDate) setDate(v.expenseDate);
          }}
        />
      )}
      <form
        action={action}
        className="office-form"
        onSubmit={(event) => {
          if (mediaBusy || amountError || customError) event.preventDefault();
        }}
      >
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="expenseId" value={expense?.id || ""} />
        <input type="hidden" name="receiptUploadId" value={upload} />
        <input
          type="hidden"
          name="shares"
          value={JSON.stringify(
            selected.map((userId) => ({
              userId,
              amount: mode === "custom" ? custom[userId] || "0" : "0",
            })),
          )}
        />
        <label>
          Mô tả
          <input
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={300}
            placeholder="Ví dụ: Bữa trưa thứ Sáu"
          />
        </label>
        <div className="field-row">
          <label>
            Tổng tiền ({currency})
            <input
              name="amount"
              type="text"
              aria-label={`Tổng tiền (${currency})`}
              inputMode={dp ? "decimal" : "numeric"}
              pattern={moneyInputPattern(dp)}
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(amountError)}
              aria-describedby={`${moneyId}-amount-preview${amountError ? ` ${moneyId}-amount-error` : ""}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <output
              id={`${moneyId}-amount-preview`}
              className="muted"
              aria-live="polite"
              data-testid="expense-amount-preview"
            >
              {amount && !amountError
                ? `Số tiền sẽ lưu: ${formatAmount(new Big(amount), currency as CurrencyCode)}`
                : "Nhập tổng tiền, không dùng dấu phân cách hàng nghìn."}
            </output>
            {amountError && (
              <span
                id={`${moneyId}-amount-error`}
                className="form-error"
                role="alert"
              >
                {amountError}
              </span>
            )}
          </label>
          <label>
            Ngày chi
            <input
              name="expenseDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Cách chia
          <select
            aria-label="Cách chia"
            name="splitMode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="even">Chia đều</option>
            <option value="custom">Nhập số tiền riêng</option>
          </select>
        </label>
        <fieldset className="split-set">
          <legend>
            Người cùng chia ({selected.length}/{members.length})
          </legend>
          <label className="check">
            <input
              type="checkbox"
              checked={selected.length === members.length}
              onChange={(e) =>
                setSelected(
                  e.target.checked ? members.map((m) => m.user_id) : [],
                )
              }
            />
            Chọn tất cả
          </label>
          {members.map((m) => (
            <div className="split-member" key={m.user_id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={selected.includes(m.user_id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, m.user_id]
                        : selected.filter((id) => id !== m.user_id),
                    )
                  }
                />
                {m.profile?.name || "Thành viên"}
              </label>
              {mode === "custom" && selected.includes(m.user_id) && (
                <label className="share-amount">
                  Số tiền
                  <input
                    type="text"
                    aria-label={`Phần của ${m.profile?.name || "thành viên"}`}
                    inputMode={dp ? "decimal" : "numeric"}
                    pattern={moneyInputPattern(dp)}
                    maxLength={32}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(
                      moneyInputError(custom[m.user_id] || "", dp, true),
                    )}
                    value={custom[m.user_id] || ""}
                    onChange={(e) =>
                      setCustom({ ...custom, [m.user_id]: e.target.value })
                    }
                    required
                  />
                </label>
              )}
            </div>
          ))}
          {mode === "custom" && (
            <p className={remaining === "0" ? "toast" : "form-error"}>
              Chênh lệch so với tổng: {remaining} {currency}
            </p>
          )}
          {customError && (
            <p className="form-error" role="alert">
              {customError}
            </p>
          )}
        </fieldset>
        {upload && (
          <>
            <SavedImage
              uploadId={upload}
              alt="Hóa đơn đang tạo"
              className="receipt-image"
            />
            <p className="toast">
              Đã đính kèm ảnh hóa đơn. Vui lòng kiểm tra các số liệu trước khi
              lưu.
            </p>
          </>
        )}
        {state.error && (
          <p role="alert" className="form-error">
            {state.error}
          </p>
        )}
        <SubmitButton
          label={expense ? "Lưu thay đổi" : "Tạo expense"}
          pendingLabel="Đang lưu…"
          disabled={Boolean(mediaBusy || amountError || customError)}
        />
      </form>
    </section>
  );
}
