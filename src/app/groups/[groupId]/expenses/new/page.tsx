import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { Heading } from "@/app/components/OfficeUI";
import ExpenseEditor from "@/app/components/ExpenseEditor";
import { groupData } from "@/lib/office-data";
export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const data = await groupData(groupId);
  if (!data) notFound();
  return (
    <AppShell>
      <Link href={`/groups/${groupId}`} className="back-link">
        ← {data.group.name}
      </Link>
      <Heading
        title="Tạo expense"
        description="Bạn là người đã ứng tiền. Chọn những người cùng chia khoản chi này."
      />
      <div className="narrow">
        <ExpenseEditor
          groupId={groupId}
          currency={data.group.currency}
          members={data.members}
        />
      </div>
    </AppShell>
  );
}
