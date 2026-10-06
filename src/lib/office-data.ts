import { requireUser } from "@/lib/supabase/server";
import { cache } from "react";
import type {
  Group,
  Profile,
  Member,
  Expense,
  Share,
  JoinRequest,
} from "./office-types";
export function checked<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error("Không thể tải dữ liệu. Vui lòng thử lại.");
  return result.data as T;
}
export async function collectRows<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const page = checked(await read(start, start + 499)) || [];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
}
export async function officeContext(next = "/") {
  const { supabase, user } = await requireUser(next);
  return { supabase, user };
}
export async function profilesFor(
  ids: string[],
): Promise<Map<string, Profile>> {
  if (!ids.length) return new Map();
  const { supabase } = await requireUser();
  const unique = [...new Set(ids)];
  const rows: Profile[] = [];
  for (let start = 0; start < unique.length; start += 100)
    rows.push(
      ...(checked(
        await supabase
          .from("profiles")
          .select("id,name")
          .in("id", unique.slice(start, start + 100)),
      ) as Profile[]),
    );
  return new Map(rows.map((p) => [p.id, p]));
}
export const groupsForUser = cache(async (): Promise<Group[]> => {
  const { supabase } = await requireUser();
  return collectRows<Group>((start, end) =>
    supabase
      .from("office_groups")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, end),
  );
});

export const unreadNotifications = cache(async () => {
  const { supabase } = await requireUser();
  const result = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  checked(result);
  return result.count || 0;
});

/** Form data stays small even when a group's expense history has grown. */
export const groupMembersData = cache(async (id: string) => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const { supabase, user } = await requireUser(`/groups/${id}`);
  const group = checked(
    await supabase.from("office_groups").select("*").eq("id", id).maybeSingle(),
  ) as Group | null;
  if (!group) return null;
  const members = await collectRows<Member>((start, end) =>
    supabase
      .from("group_members")
      .select("*")
      .eq("group_id", id)
      .order("joined_at")
      .order("user_id")
      .range(start, end),
  );
  const names = await profilesFor(members.map((member) => member.user_id));
  return {
    group,
    user,
    members: members.map((member) => ({
      ...member,
      profile: names.get(member.user_id),
    })),
  };
});

export async function groupData(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const { supabase, user } = await requireUser(`/groups/${id}`);
  const group = checked(
    await supabase.from("office_groups").select("*").eq("id", id).maybeSingle(),
  ) as Group | null;
  if (!group) return null;
  const [members, expenses, requests] = await Promise.all([
    collectRows<Member>((a, b) =>
      supabase
        .from("group_members")
        .select("*")
        .eq("group_id", id)
        .order("joined_at")
        .order("user_id")
        .range(a, b),
    ),
    collectRows<Expense>((a, b) =>
      supabase
        .from("office_expenses")
        .select("*")
        .eq("group_id", id)
        .order("expense_date", { ascending: false })
        .order("id")
        .range(a, b),
    ),
    collectRows<JoinRequest>((a, b) =>
      supabase
        .from("join_requests")
        .select("*")
        .eq("group_id", id)
        .eq("status", "pending")
        .order("id")
        .range(a, b),
    ),
  ]);
  const names = await profilesFor([
    ...members.map((x) => x.user_id),
    ...requests.map((x) => x.user_id),
  ]);
  return {
    group,
    user,
    members: members.map((x) => ({ ...x, profile: names.get(x.user_id) })),
    requests: requests.map((x) => ({ ...x, profile: names.get(x.user_id) })),
    expenses: expenses.map((x) => ({ ...x, amount: String(x.amount) })),
  };
}
export async function expenseData(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const { supabase, user } = await requireUser(`/expenses/${id}`);
  const expense = checked(
    await supabase
      .from("office_expenses")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
  ) as Expense | null;
  if (!expense) return null;
  expense.amount = String(expense.amount);
  const [groupResult, rawShares] = await Promise.all([
    supabase
      .from("office_groups")
      .select("*")
      .eq("id", expense.group_id)
      .single(),
    collectRows<Share>((a, b) =>
      supabase
        .from("office_shares")
        .select("*")
        .eq("expense_id", id)
        .order("user_id")
        .range(a, b),
    ),
  ]);
  const group = checked(groupResult) as Group;
  const shares = rawShares.map((s) => ({ ...s, amount: String(s.amount) }));
  const names = await profilesFor([
    ...shares.map((s) => s.user_id),
    expense.creator_id,
  ]);
  return { user, supabase, expense, group, shares, names };
}
