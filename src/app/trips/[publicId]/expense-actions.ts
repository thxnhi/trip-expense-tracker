"use server";
import { redirect } from "next/navigation";
export interface ExpenseFormState {
  error?: string;
  ok?: boolean;
}
const retired =
  "Luồng chuyến đi cũ đã đóng. Hãy dùng expense trong nhóm sau khi đăng nhập.";
export async function addExpenseAction(): Promise<ExpenseFormState> {
  return { error: retired };
}
export async function updateExpenseAction(): Promise<ExpenseFormState> {
  return { error: retired };
}
export async function deleteExpenseAction(): Promise<void> {
  redirect("/");
}
