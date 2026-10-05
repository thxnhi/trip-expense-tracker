export type Group = {
  id: string;
  name: string;
  currency: string;
  owner_id: string;
  invite_token: string;
  created_at: string;
};
export type Profile = { id: string; name: string };
export type Member = {
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
};
export type JoinRequest = {
  id: string;
  group_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  profile?: Profile;
};
export type Expense = {
  id: string;
  group_id: string;
  creator_id: string;
  description: string;
  amount: string;
  expense_date: string;
  status: "active" | "completed" | "cancelled";
  receipt_upload_id: string | null;
  cancel_reason: string | null;
  has_reported: boolean;
  created_at: string;
};
export type Share = {
  expense_id: string;
  user_id: string;
  amount: string;
  payment_status: "pending" | "reported" | "confirmed" | "self";
};
export type BankAccount = {
  user_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  transfer_template: string;
  qr_upload_id: string | null;
};
export type OfficeState = { error?: string; success?: string };
