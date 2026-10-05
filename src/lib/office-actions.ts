"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { OfficeState } from "./office-types";
const text = (f: FormData, key: string) => String(f.get(key) || "").trim();
const errorMessage = (error: { message: string }) => {
  const message = error.message;
  const translations: Record<string, string> = {
    "Authentication required": "Vui lòng đăng nhập để tiếp tục.",
    "Group owner required":
      "Chỉ quản trị viên nhóm được thực hiện thao tác này.",
    "Group membership required": "Bạn chưa được duyệt vào nhóm này.",
    "Invalid invitation": "Link mời không còn hiệu lực. Hãy xin link mới.",
    "Already a member": "Bạn đã là thành viên nhóm.",
    "Invalid amount": "Số tiền không hợp lệ.",
    "Invalid currency amount":
      "Hãy nhập số tiền dương với số chữ số thập phân phù hợp tiền tệ.",
    "Invalid shares": "Hãy chọn ít nhất một người cùng chia tiền.",
    "Duplicate share members": "Danh sách người chia bị trùng.",
    "Share member is not approved":
      "Danh sách chỉ được gồm thành viên đã được duyệt.",
    "Invalid share amount": "Số tiền từng người phải là số không âm.",
    "Invalid share precision":
      "Số tiền từng người không đúng độ chính xác của tiền tệ.",
    "Shares must sum to expense amount":
      "Tổng số tiền từng người phải bằng tổng expense.",
    "Expense creator required":
      "Chỉ người ứng tiền được sửa expense hoặc xác nhận thanh toán.",
    "Expense shares are locked":
      "Đã có người báo chuyển hoặc expense đã hủy; không thể sửa phần chia.",
    "Invalid QR upload":
      "Ảnh QR không hợp lệ hoặc chưa tải xong. Hãy chọn lại ảnh.",
    "Invalid receipt upload":
      "Ảnh hóa đơn không hợp lệ hoặc chưa tải xong. Hãy chọn lại ảnh.",
    "Receipt already attached":
      "Ảnh hóa đơn này đã được dùng cho expense khác.",
  };
  if (translations[message]) return translations[message];
  if (/constraint|violates|invalid input|not-null|numeric field/i.test(message))
    return "Dữ liệu chưa hợp lệ. Hãy kiểm tra các trường bắt buộc và số tiền.";
  return "Không thể thực hiện thao tác. Vui lòng tải lại trang và thử lại.";
};
async function rpc(name: string, args: Record<string, unknown>) {
  const { supabase } = await requireUser();
  const result = await supabase.rpc(name, args);
  return {
    data: result.data,
    error: result.error ? errorMessage(result.error) : null,
  };
}
export async function createGroup(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const { data, error } = await rpc("create_group", {
    p_name: text(f, "name"),
    p_currency: text(f, "currency"),
  });
  if (error) return { error };
  revalidatePath("/");
  redirect(`/groups/${data}`);
}
export async function renameGroup(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const id = text(f, "groupId");
  const { error } = await rpc("rename_group", {
    p_group_id: id,
    p_name: text(f, "name"),
  });
  if (error) return { error };
  revalidatePath(`/groups/${id}`);
  revalidatePath("/");
  return { success: "Đã đổi tên nhóm." };
}
export async function rotateInvite(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const id = text(f, "groupId");
  const { error } = await rpc("rotate_invite", { p_group_id: id });
  if (error) return { error };
  revalidatePath(`/groups/${id}`);
  return { success: "Đã tạo link mới. Link cũ đã bị thu hồi." };
}
export async function requestJoin(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const token = text(f, "token");
  const { error } = await rpc("request_join", { p_token: token });
  if (error) return { error };
  revalidatePath(`/invite/${token}`);
  return { success: "Đã gửi yêu cầu. Hãy chờ quản trị viên duyệt." };
}
export async function decideJoin(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const { error } = await rpc("decide_join", {
    p_request_id: text(f, "requestId"),
    p_approve: text(f, "approve") === "true",
  });
  if (error) return { error };
  revalidatePath(`/groups/${text(f, "groupId")}`);
  return { success: "Đã xử lý yêu cầu." };
}
export async function saveExpense(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  let shares: unknown;
  try {
    shares = JSON.parse(text(f, "shares"));
  } catch {
    return { error: "Hãy chọn người chia tiền." };
  }
  const { data, error } = await rpc("save_expense", {
    p_expense_id: text(f, "expenseId") || null,
    p_group_id: text(f, "groupId"),
    p_description: text(f, "description"),
    p_amount: text(f, "amount"),
    p_expense_date: text(f, "expenseDate"),
    p_split_mode: text(f, "splitMode"),
    p_shares: shares,
    p_receipt_upload_id: text(f, "receiptUploadId") || null,
  });
  if (error) return { error };
  revalidatePath(`/groups/${text(f, "groupId")}`);
  revalidatePath("/statistics");
  redirect(`/expenses/${data}`);
}
export async function editMetadata(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const id = text(f, "expenseId");
  const { error } = await rpc("edit_expense_metadata", {
    p_expense_id: id,
    p_description: text(f, "description"),
    p_expense_date: text(f, "expenseDate"),
  });
  if (error) return { error };
  revalidatePath(`/expenses/${id}`);
  revalidatePath("/statistics");
  redirect(`/expenses/${id}`);
}
export async function paymentAction(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const id = text(f, "expenseId");
  const { error } = await rpc("payment_action", {
    p_expense_id: id,
    p_action: text(f, "operation"),
    p_user_id: text(f, "userId"),
  });
  if (error) return { error };
  revalidatePath(`/expenses/${id}`);
  revalidatePath(`/groups/${text(f, "groupId")}`);
  revalidatePath("/statistics");
  revalidatePath("/notifications");
  return { success: "Đã cập nhật trạng thái thanh toán." };
}
export async function cancelExpense(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const id = text(f, "expenseId");
  const { error } = await rpc("cancel_expense", {
    p_expense_id: id,
    p_reason: text(f, "reason"),
  });
  if (error) return { error };
  revalidatePath(`/expenses/${id}`);
  revalidatePath(`/groups/${text(f, "groupId")}`);
  revalidatePath("/statistics");
  return { success: "Đã hủy expense và giữ lịch sử đối soát." };
}
export async function saveBank(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const { error } = await rpc("save_bank_profile", {
    p_bank_name: text(f, "bankName"),
    p_account_number: text(f, "accountNumber"),
    p_account_holder: text(f, "accountHolder"),
    p_transfer_template: text(f, "transferTemplate"),
    p_qr_upload_id: text(f, "qrUploadId") || null,
  });
  if (error) return { error };
  revalidatePath("/profile");
  return { success: "Đã lưu tài khoản ngân hàng." };
}
export async function saveProfile(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const { error } = await rpc("save_profile", { p_name: text(f, "name") });
  if (error) return { error };
  revalidatePath("/profile");
  revalidatePath("/");
  return { success: "Đã lưu tên hiển thị." };
}
export async function readNotification(
  _: OfficeState,
  f: FormData,
): Promise<OfficeState> {
  const { supabase, user } = await requireUser();
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  const id = text(f, "notificationId");
  if (id) query = query.eq("id", id);
  const { error } = await query;
  if (error) return { error: "Không thể đánh dấu đã đọc." };
  revalidatePath("/notifications");
  return { success: "Đã đánh dấu đã đọc." };
}
