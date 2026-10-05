import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
);
const base = "http://localhost:3100";
const password = `Test-${randomUUID()}!`;
let admin: SupabaseClient;
const people: { id: string; email: string; name: string }[] = [];

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(base + "/");
}

test.describe("real Supabase office workflow", () => {
  test.skip(
    !configured,
    "Run npm run db:start and node scripts/prepare-e2e.mjs first.",
  );
  test.beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (
      !["localhost", "127.0.0.1"].includes(new URL(url).hostname) &&
      process.env.E2E_ALLOW_REMOTE !== "true"
    ) {
      throw new Error(
        "E2E mutates test data. Only local Supabase is allowed unless E2E_ALLOW_REMOTE=true for an isolated staging project.",
      );
    }
    admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
    });
    for (const name of ["Người ứng tiền", "Đồng nghiệp", "Người ngoài nhóm"]) {
      const email = `${randomUUID()}@example.test`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error || !data.user)
        throw new Error("Could not create an isolated E2E account.");
      people.push({ id: data.user.id, email, name });
    }
  });

  test.afterAll(async () => {
    if (!admin || !people.length) return;
    const ids = people.map((person) => person.id);
    const { data: groups } = await admin
      .from("office_groups")
      .select("id")
      .in("owner_id", ids);
    const groupIds = (groups || []).map((group) => group.id);
    if (groupIds.length) {
      const { data: expenses } = await admin
        .from("office_expenses")
        .select("id")
        .in("group_id", groupIds);
      const expenseIds = (expenses || []).map((expense) => expense.id);
      if (expenseIds.length) {
        await admin
          .from("payment_events")
          .delete()
          .in("expense_id", expenseIds);
        await admin.from("office_shares").delete().in("expense_id", expenseIds);
        await admin.from("notifications").delete().in("group_id", groupIds);
        await admin.from("office_expenses").delete().in("id", expenseIds);
      }
      await admin.from("notifications").delete().in("group_id", groupIds);
    }
    await admin.from("notifications").delete().in("user_id", ids);
    await admin.from("bank_profiles").delete().in("user_id", ids);
    const { data: uploads } = await admin
      .from("uploads")
      .select("path,preview_path")
      .in("user_id", ids);
    const paths = (uploads || []).flatMap((upload) =>
      [upload.path, upload.preview_path].filter(Boolean),
    );
    if (paths.length) await admin.storage.from("office-images").remove(paths);
    await admin.from("uploads").delete().in("user_id", ids);
    if (groupIds.length)
      await admin.from("office_groups").delete().in("id", groupIds);
    for (const person of people) await admin.auth.admin.deleteUser(person.id);
    people.length = 0;
  });

  test("approval, bank QR, camera upload, Groq OCR, repayment, cancellation and statistics", async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);
    const [owner, member, outsider] = people;
    const device = testInfo.project.use;
    const options = {
      viewport: device.viewport,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      deviceScaleFactor: device.deviceScaleFactor,
      userAgent: device.userAgent,
    };
    const memberContext = await browser.newContext(options);
    const outsideContext = await browser.newContext(options);
    const memberPage = await memberContext.newPage();
    const outsidePage = await outsideContext.newPage();
    try {
      await login(page, owner.email);
      const groupName = `Nhóm kiểm thử ${randomUUID().slice(0, 8)}`;
      await page.getByLabel("Tên nhóm", { exact: true }).fill(groupName);
      await page.getByRole("button", { name: "Tạo nhóm", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: groupName }),
      ).toBeVisible();
      const groupId = new URL(page.url()).pathname.split("/").pop()!;
      const { data: group } = await admin
        .from("office_groups")
        .select("invite_token")
        .eq("id", groupId)
        .single();
      expect(group).not.toBeNull();
      const invite = `${base}/invite/${group!.invite_token}`;

      // Anonymous invitation returns to the original invite after login.
      await memberPage.goto(invite);
      await expect(memberPage).toHaveURL(/\/login\?next=/);
      await memberPage.getByLabel("Email", { exact: true }).fill(member.email);
      await memberPage.getByLabel("Mật khẩu", { exact: true }).fill(password);
      await memberPage
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .last()
        .click();
      await expect(
        memberPage.getByRole("heading", { name: groupName }),
      ).toBeVisible();
      await memberPage
        .getByRole("button", { name: "Xin tham gia nhóm" })
        .click();
      await expect(
        memberPage.getByText(
          "Bạn sẽ xem được dữ liệu nhóm sau khi quản trị viên duyệt.",
        ),
      ).toBeVisible();
      await memberPage.goto(`${base}/groups/${groupId}`);
      await expect(
        memberPage.getByRole("heading", { name: "Không tìm thấy nội dung" }),
      ).toBeVisible();

      await page.reload();
      await page.getByRole("button", { name: "Duyệt", exact: true }).click();
      await expect(page.getByText("Yêu cầu tham gia (0)")).toBeVisible();
      await memberPage.goto(`${base}/groups/${groupId}`);
      await expect(
        memberPage.getByRole("heading", { name: groupName }),
      ).toBeVisible();

      await page.goto(`${base}/profile`);
      await page
        .getByLabel("Ngân hàng", { exact: true })
        .fill("Ngân hàng kiểm thử");
      await page.getByLabel("Số tài khoản", { exact: true }).fill("0123456789");
      await page
        .getByLabel("Tên chủ tài khoản", { exact: true })
        .fill("NGUOI UNG TIEN");
      await page
        .getByLabel("Nội dung chuyển khoản mặc định", { exact: true })
        .fill("Hoan tra bua trua");
      const qr = await sharp({
        create: { width: 256, height: 256, channels: 3, background: "white" },
      })
        .png()
        .toBuffer();
      await page
        .locator('input[type="file"]')
        .last()
        .setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: qr });
      await expect(
        page.getByText("Ảnh đã tải xong.", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Lưu ngân hàng", exact: true })
        .click();
      await expect(
        page.getByText("Đã lưu tài khoản ngân hàng.", { exact: true }),
      ).toBeVisible();

      await page.goto(`${base}/groups/${groupId}/expenses/new`);
      await page.getByRole("button", { name: "Chụp / quét hóa đơn" }).click();
      await expect(
        page.getByRole("button", { name: "Chụp hóa đơn", exact: true }),
      ).toBeVisible();
      await expect(
        page.locator('input[capture="environment"]'),
      ).toHaveAttribute("accept", /image/);
      // Original phone image exceeds Vercel's 4.5 MB body limit; upload bypasses Functions.
      const raw = randomBytes(1500 * 1500 * 3);
      const receipt = await sharp(raw, {
        raw: { width: 1500, height: 1500, channels: 3 },
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      expect(receipt.length).toBeGreaterThan(4.5 * 1024 * 1024);
      await page.locator('input[capture="environment"]').setInputFiles({
        name: "phone-receipt.png",
        mimeType: "image/png",
        buffer: receipt,
      });
      await expect(
        page.getByText("Ảnh đã tải xong.", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Quét hóa đơn", exact: true })
        .click();
      await expect(page.getByLabel("Tổng tiền (VND)")).toHaveValue("101000");
      await expect(page.getByLabel("Mô tả", { exact: true })).toHaveValue(
        "Bữa trưa OCR",
      );
      await page
        .getByRole("button", { name: "Tạo expense", exact: true })
        .click();
      await expect(page).toHaveURL(/\/expenses\/[0-9a-f-]+$/);
      const expenseId = new URL(page.url()).pathname.split("/").pop()!;
      await expect(
        page.getByRole("heading", { name: "Bữa trưa OCR" }),
      ).toBeVisible();
      await expect(
        page.getByText("0123456789", { exact: false }),
      ).toBeVisible();
      const { data: expense } = await admin
        .from("office_expenses")
        .select("receipt_upload_id")
        .eq("id", expenseId)
        .single();
      expect(expense?.receipt_upload_id).toBeTruthy();

      await login(outsidePage, outsider.email);
      await outsidePage.goto(`${base}/expenses/${expenseId}`);
      await expect(
        outsidePage.getByRole("heading", { name: "Không tìm thấy nội dung" }),
      ).toBeVisible();
      const deniedImage = await outsidePage.request.get(
        `${base}/api/uploads/${expense!.receipt_upload_id}`,
      );
      expect(deniedImage.status()).toBe(404);

      await memberPage.goto(`${base}/expenses/${expenseId}`);
      await memberPage
        .getByRole("button", { name: "Tôi đã chuyển tiền" })
        .click();
      await expect(
        memberPage.getByText("Chờ xác nhận", {
          exact: true,
        }),
      ).toBeVisible();
      await page.reload();
      await page
        .getByRole("button", { name: "Xác nhận đã nhận", exact: true })
        .click();
      await expect(page.getByText("Hoàn tất", { exact: true })).toBeVisible();
      await expect(
        page.getByText("1/1 người cần chuyển đã xác nhận", { exact: false }),
      ).toBeVisible();

      await page.goto(
        `${base}/statistics?group=${groupId}&from=2026-10-01&to=2026-10-31`,
      );
      await expect(page.getByText("Tổng chi", { exact: true })).toBeVisible();
      await expect(
        page.getByText("101.000 ₫", { exact: true }).first(),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath("statistics.png"),
        fullPage: true,
      });

      await page.goto(`${base}/expenses/${expenseId}`);
      await page.getByText("Hủy expense", { exact: true }).first().click();
      await page.getByLabel("Lý do hủy").fill("Nhập nhầm hóa đơn");
      await page
        .getByRole("button", { name: "Hủy expense", exact: true })
        .click();
      await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible();
      await expect(
        page.getByText("Nhập nhầm hóa đơn", { exact: false }).first(),
      ).toBeVisible();
      await page.goto(`${base}/notifications`);
      await expect(
        page.getByRole("heading", { name: "Thông báo" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Đánh dấu tất cả đã đọc" })
        .click();
      await page.screenshot({
        path: testInfo.outputPath("notifications.png"),
        fullPage: true,
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
    } finally {
      await memberContext.close();
      await outsideContext.close();
    }
  });
});
