import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import ActionForm from "@/app/components/ActionForm";
import { Heading } from "@/app/components/OfficeUI";
import ExpenseEditor from "@/app/components/ExpenseEditor";
import { expenseData, groupMembersData } from "@/lib/office-data";
import { editMetadata } from "@/lib/office-actions";
export default async function EditPage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  const data = await expenseData(expenseId);
  if (
    !data ||
    data.expense.creator_id !== data.user.id ||
    data.expense.status === "cancelled"
  )
    notFound();
  const members = data.expense.has_reported
    ? []
    : (await groupMembersData(data.group.id))?.members;
  if (!members) notFound();
  return (
    <AppShell>
      <Link className="back-link" href={`/expenses/${expenseId}`}>
        ← Chi tiết expense
      </Link>
      <Heading
        title="Chỉnh sửa expense"
        description={
          data.expense.has_reported
            ? "Đã có người báo chuyển; chỉ có thể sửa mô tả và ngày."
            : "Bạn có thể sửa phần chia trước lần báo chuyển đầu tiên."
        }
      />
      <div className="narrow">
        {data.expense.has_reported ? (
          <section className="card">
            <ActionForm action={editMetadata} label="Lưu thay đổi">
              <input type="hidden" name="expenseId" value={expenseId} />
              <label>
                Mô tả
                <input
                  name="description"
                  defaultValue={data.expense.description}
                  required
                  maxLength={300}
                />
              </label>
              <label>
                Ngày chi
                <input
                  name="expenseDate"
                  type="date"
                  defaultValue={data.expense.expense_date}
                  required
                />
              </label>
            </ActionForm>
          </section>
        ) : (
          <ExpenseEditor
            groupId={data.group.id}
            currency={data.group.currency}
            members={members}
            expense={data.expense}
            shares={data.shares}
          />
        )}
      </div>
    </AppShell>
  );
}
