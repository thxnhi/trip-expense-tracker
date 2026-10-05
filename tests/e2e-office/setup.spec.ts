import { test, expect } from "@playwright/test";

test("shows setup guidance when Supabase is not configured", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    "Configured environments use the real account tests.",
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Cấu hình ứng dụng" }),
  ).toBeVisible();
  await expect(page.getByText(".env.example", { exact: true })).toBeVisible();
});

test("legacy public trip URLs no longer expose expenses", async ({ page }) => {
  await page.goto("/trips/legacy-secret");
  await expect(page).not.toHaveURL(/\/trips\//);
  await expect(
    page.getByRole("heading", { name: "Chia tiền dễ dàng" }),
  ).toBeVisible();
});
