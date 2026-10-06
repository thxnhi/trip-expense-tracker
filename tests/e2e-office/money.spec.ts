import { test, expect, type Locator, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
);
const password = `Money-${randomUUID()}!`;
const users: { id: string; email: string; name: string }[] = [];
const groupIds: string[] = [];
let admin: SupabaseClient;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL("http://localhost:3100/");
}

async function assertInputStaysExact(
  page: Page,
  input: Locator,
  amount: string,
) {
  await input.fill(amount);
  await input.focus();
  for (let press = 0; press < 13; press++) await input.press("ArrowDown");
  const box = await input.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 200);
  await expect(input).toHaveValue(amount);
  await expect(input).toHaveAttribute("type", "text");
}

async function createGroup(currency: string) {
  const { data: group, error } = await admin
    .from("office_groups")
    .insert({
      name: `Money regression ${randomUUID().slice(0, 8)}`,
      currency,
      owner_id: users[0].id,
    })
    .select("id")
    .single();
  if (error || !group)
    throw new Error("Could not create an isolated money-test group.");
  groupIds.push(group.id);
  const { error: membershipError } = await admin
    .from("group_members")
    .insert(users.map((user) => ({ group_id: group.id, user_id: user.id })));
  if (membershipError)
    throw new Error("Could not create money-test memberships.");
  return group.id as string;
}

async function storedAmounts(expenseId: string) {
  const [expense, shares] = await Promise.all([
    admin.from("office_expenses").select("amount").eq("id", expenseId).single(),
    admin.from("office_shares").select("amount").eq("expense_id", expenseId),
  ]);
  if (expense.error || shares.error)
    throw new Error("Could not verify exact saved money.");
  return {
    amount: String(expense.data!.amount),
    shares: shares.data!.map((share) => String(share.amount)).sort(),
  };
}

test.describe("monetary input regression with real Supabase", () => {
  test.skip(
    !configured,
    "Prepare isolated local Supabase E2E credentials first.",
  );
  test.beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
      throw new Error(
        "Money regression may only mutate local Supabase test data.",
      );
    admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
    });
    for (const name of ["Kiểm thử tiền A", "Kiểm thử tiền B"]) {
      const email = `${randomUUID()}@example.test`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error || !data.user)
        throw new Error("Could not create money-test account.");
      users.push({ id: data.user.id, email, name });
    }
  });
  test.afterAll(async () => {
    if (!admin) return;
    if (groupIds.length) {
      const { data: expenses } = await admin
        .from("office_expenses")
        .select("id")
        .in("group_id", groupIds);
      const expenseIds = (expenses || []).map((expense) => expense.id);
      if (expenseIds.length)
        await admin
          .from("payment_events")
          .delete()
          .in("expense_id", expenseIds);
      await admin.from("notifications").delete().in("group_id", groupIds);
      if (expenseIds.length)
        await admin.from("office_expenses").delete().in("id", expenseIds);
      await admin.from("office_groups").delete().in("id", groupIds);
    }
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
    users.length = 0;
    groupIds.length = 0;
  });

  test("120000 VND survives arrows and scrolling and saves two shares of 60000", async ({
    page,
  }) => {
    const groupId = await createGroup("VND");
    await login(page);
    await page.goto(`/groups/${groupId}/expenses/new`);
    await page.getByLabel("Mô tả", { exact: true }).fill("Giữ đúng 120000 VND");
    await assertInputStaysExact(
      page,
      page.getByLabel("Tổng tiền (VND)", { exact: true }),
      "120000",
    );
    await expect(page.getByTestId("expense-amount-preview")).toHaveText(
      /Số tiền sẽ lưu: 120\.000\s*₫/,
    );
    await page
      .getByRole("button", { name: "Tạo expense", exact: true })
      .click();
    await expect(page).toHaveURL(/\/expenses\/[0-9a-f-]+$/);
    const expenseId = new URL(page.url()).pathname.split("/").pop()!;
    expect(await storedAmounts(expenseId)).toEqual({
      amount: "120000",
      shares: ["60000", "60000"],
    });
    await expect(
      page.getByText("120.000 ₫", { exact: true }).first(),
    ).toBeVisible();
  });

  test("custom decimal shares stay exact without spin-button changes", async ({
    page,
  }) => {
    const groupId = await createGroup("USD");
    await login(page);
    await page.goto(`/groups/${groupId}/expenses/new`);
    await page
      .getByLabel("Mô tả", { exact: true })
      .fill("Giữ đúng phần chia thập phân");
    await assertInputStaysExact(
      page,
      page.getByLabel("Tổng tiền (USD)", { exact: true }),
      "1234.56",
    );
    await page.getByLabel("Cách chia", { exact: true }).selectOption("custom");
    await assertInputStaysExact(
      page,
      page.getByLabel("Phần của Kiểm thử tiền A", { exact: true }),
      "123.45",
    );
    await assertInputStaysExact(
      page,
      page.getByLabel("Phần của Kiểm thử tiền B", { exact: true }),
      "1111.11",
    );
    await page
      .getByRole("button", { name: "Tạo expense", exact: true })
      .click();
    await expect(page).toHaveURL(/\/expenses\/[0-9a-f-]+$/);
    const expenseId = new URL(page.url()).pathname.split("/").pop()!;
    expect(await storedAmounts(expenseId)).toEqual({
      amount: "1234.56",
      shares: ["1111.11", "123.45"],
    });
  });
});
