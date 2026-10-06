import Big from "big.js";
import type { Expense, Group, Share } from "./office-types";
export type Totals = {
  spent: string;
  toCollect: string;
  received: string;
  reported: string;
  outstanding: string;
  completed: number;
  advanced: string;
  personalShare: string;
  repaid: string;
  toPay: string;
  toReceive: string;
  cancelledReceived: string;
};
export type PersonTotals = {
  userId: string;
  share: string;
  advanced: string;
  repaid: string;
  toPay: string;
  toReceive: string;
};
export type CurrencyStats = {
  currency: string;
  totals: Totals;
  people: PersonTotals[];
  months: { month: string; amount: string }[];
};
const add = (a: string, b: string) => new Big(a).plus(b).toString();
const empty = (): Totals => ({
  spent: "0",
  toCollect: "0",
  received: "0",
  reported: "0",
  outstanding: "0",
  completed: 0,
  advanced: "0",
  personalShare: "0",
  repaid: "0",
  toPay: "0",
  toReceive: "0",
  cancelledReceived: "0",
});
export function calculateStats(
  groups: Group[],
  expenses: Expense[],
  shares: Share[],
  userId: string,
): CurrencyStats[] {
  const byGroup = new Map(groups.map((g) => [g.id, g]));
  const sharesByExpense = new Map<string, Share[]>();
  for (const share of shares) {
    const list = sharesByExpense.get(share.expense_id) || [];
    list.push(share);
    sharesByExpense.set(share.expense_id, list);
  }
  const buckets = new Map<
    string,
    {
      totals: Totals;
      people: Map<string, PersonTotals>;
      months: Map<string, string>;
    }
  >();
  for (const group of groups) {
    if (!buckets.has(group.currency))
      buckets.set(group.currency, {
        totals: empty(),
        people: new Map(),
        months: new Map(),
      });
  }
  for (const e of expenses) {
    const group = byGroup.get(e.group_id);
    if (!group) continue;
    const b = buckets.get(group.currency)!;
    const person = (id: string) => {
      if (!b.people.has(id))
        b.people.set(id, {
          userId: id,
          share: "0",
          advanced: "0",
          repaid: "0",
          toPay: "0",
          toReceive: "0",
        });
      return b.people.get(id)!;
    };
    const parts = sharesByExpense.get(e.id) || [];
    if (e.status === "cancelled") {
      b.totals.cancelledReceived = parts
        .filter((s) => s.payment_status === "confirmed")
        .reduce((sum, s) => add(sum, s.amount), b.totals.cancelledReceived);
      continue;
    }
    b.totals.spent = add(b.totals.spent, e.amount);
    if (e.status === "completed") b.totals.completed++;
    const month = e.expense_date.slice(0, 7);
    b.months.set(month, add(b.months.get(month) || "0", e.amount));
    person(e.creator_id).advanced = add(
      person(e.creator_id).advanced,
      e.amount,
    );
    if (e.creator_id === userId)
      b.totals.advanced = add(b.totals.advanced, e.amount);
    for (const s of parts) {
      const p = person(s.user_id);
      p.share = add(p.share, s.amount);
      if (s.user_id === userId)
        b.totals.personalShare = add(b.totals.personalShare, s.amount);
      if (s.payment_status === "self" || new Big(s.amount).eq(0)) continue;
      b.totals.toCollect = add(b.totals.toCollect, s.amount);
      if (s.payment_status === "confirmed") {
        b.totals.received = add(b.totals.received, s.amount);
        p.repaid = add(p.repaid, s.amount);
        if (s.user_id === userId)
          b.totals.repaid = add(b.totals.repaid, s.amount);
      } else {
        b.totals.outstanding = add(b.totals.outstanding, s.amount);
        p.toPay = add(p.toPay, s.amount);
        person(e.creator_id).toReceive = add(
          person(e.creator_id).toReceive,
          s.amount,
        );
        if (s.payment_status === "reported")
          b.totals.reported = add(b.totals.reported, s.amount);
        if (s.user_id === userId)
          b.totals.toPay = add(b.totals.toPay, s.amount);
        if (e.creator_id === userId)
          b.totals.toReceive = add(b.totals.toReceive, s.amount);
      }
    }
  }
  return [...buckets].map(([currency, b]) => ({
    currency,
    totals: b.totals,
    people: [...b.people.values()],
    months: [...b.months]
      .sort(([a], [z]) => a.localeCompare(z))
      .map(([month, amount]) => ({ month, amount })),
  }));
}
