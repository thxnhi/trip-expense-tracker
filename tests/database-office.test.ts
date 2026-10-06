import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

const owner = "10000000-0000-4000-8000-000000000001";
const member = "20000000-0000-4000-8000-000000000002";
const outsider = "30000000-0000-4000-8000-000000000003";
let db: PGlite;

async function asUser<T>(id: string | null, sql: string, args: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${id ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
      id || "",
    ]);
    return tx.query<T>(sql, args);
  });
}
async function rpc<T = unknown>(
  id: string,
  name: string,
  args: unknown[] = [],
) {
  const params = args.map((_, i) => `$${i + 1}`).join(",");
  const result = await asUser<{ value: T }>(
    id,
    `select public.${name}(${params}) as value`,
    args,
  );
  return result.rows[0].value;
}
async function groupWithMember(currency = "VND") {
  const group = await rpc<string>(owner, "create_group", [
    "Kiểm thử",
    currency,
  ]);
  const { rows } = await asUser<{ invite_token: string }>(
    owner,
    "select invite_token from office_groups where id=$1",
    [group],
  );
  const request = await rpc<string>(member, "request_join", [
    rows[0].invite_token,
  ]);
  await rpc(owner, "decide_join", [request, true]);
  return group;
}
async function expense(
  group: string,
  amount = "101",
  shares = [{ userId: owner }, { userId: member }],
  mode = "even",
) {
  return rpc<string>(owner, "save_expense", [
    null,
    group,
    "Ăn trưa",
    amount,
    "2026-10-05",
    mode,
    JSON.stringify(shares),
    null,
  ]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema public,storage to anon,authenticated,service_role;
    grant select,insert,update,delete on storage.objects to authenticated;
  `);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const filename of (await readdir(migrations))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile(new URL(filename, migrations), "utf8"));
  }
  await db.query(
    "insert into auth.users(id,email) values ($1,'owner@example.test'),($2,'member@example.test'),($3,'outsider@example.test')",
    [owner, member, outsider],
  );
}, 60_000);
afterAll(async () => {
  await db?.close();
});

describe("Supabase office migration: actual PostgreSQL functions and RLS", () => {
  it("uses the new indexes for unread counts and stable paginated lists", async () => {
    const indexedQueries = [
      [
        "notifications_user_unread",
        "select id from notifications where user_id=$1 and read_at is null",
      ],
      [
        "payment_events_expense_created_id",
        "select * from payment_events where expense_id=$1 order by created_at desc,id",
      ],
      [
        "office_expenses_group_date_id",
        "select * from office_expenses where group_id=$1 order by expense_date desc,id",
      ],
      [
        "group_members_group_joined_user",
        "select * from group_members where group_id=$1 order by joined_at,user_id",
      ],
      [
        "join_requests_group_pending_id",
        "select * from join_requests where group_id=$1 and status='pending' order by id",
      ],
    ];
    await db.transaction(async (tx) => {
      // Tiny fixture tables normally favor sequential scans; disable only in this
      // transaction to verify each real PostgreSQL index can satisfy its query.
      await tx.exec("set local enable_seqscan=off");
      for (const [index, sql] of indexedQueries) {
        const result = await tx.query(`explain (format json) ${sql}`, [owner]);
        expect(JSON.stringify(result.rows)).toContain(index);
      }
    });
  });

  it("creates auth profiles and blocks anonymous RPCs and direct business writes", async () => {
    const profiles = await asUser<{ id: string }>(
      owner,
      "select id from profiles",
    );
    expect(profiles.rows.map((p) => p.id)).toEqual([owner]);
    await expect(
      asUser(null, "select create_group('Bypass','VND')"),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(
        owner,
        "insert into office_groups(owner_id,name,currency) values($1,'Bypass','VND')",
        [owner],
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("keeps pending members isolated, permits approval, and invalidates rotated invitations", async () => {
    const group = await rpc<string>(owner, "create_group", ["Riêng tư", "VND"]);
    const row = (
      await asUser<{ invite_token: string }>(
        owner,
        "select invite_token from office_groups where id=$1",
        [group],
      )
    ).rows[0];
    const request = await rpc<string>(member, "request_join", [
      row.invite_token,
    ]);
    expect(
      (await asUser(member, "select * from office_groups where id=$1", [group]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser(member, "select * from group_members where group_id=$1", [
          group,
        ])
      ).rows,
    ).toHaveLength(0);
    await expect(rpc(member, "decide_join", [request, true])).rejects.toThrow(
      /owner/i,
    );
    expect(
      (
        await asUser<{ id: string }>(
          owner,
          "select id from profiles where id=$1",
          [member],
        )
      ).rows,
    ).toHaveLength(1);
    await rpc(owner, "decide_join", [request, true]);
    expect(
      (await asUser(member, "select * from office_groups where id=$1", [group]))
        .rows,
    ).toHaveLength(1);
    await rpc(owner, "rotate_invite", [group]);
    await expect(
      rpc(outsider, "request_join", [row.invite_token]),
    ).rejects.toThrow(/Invalid invitation/i);
  });

  it("splits deterministically and rejects precision, sum, duplicate and outsider mistakes atomically", async () => {
    const group = await groupWithMember();
    const id = await expense(group);
    const rows = (
      await asUser<{ user_id: string; amount: string; payment_status: string }>(
        owner,
        "select * from office_shares where expense_id=$1 order by user_id",
        [id],
      )
    ).rows;
    expect(rows.map((r) => r.amount)).toEqual(["50.00", "51.00"]);
    expect(rows.map((r) => r.payment_status)).toEqual(["self", "pending"]);
    await expect(expense(group, "10.1")).rejects.toThrow(/currency amount/i);
    await expect(expense(group, "NaN")).rejects.toThrow(/Invalid amount/i);
    await expect(
      expense(
        group,
        "10",
        [{ userId: member, amount: "NaN" }] as never,
        "custom",
      ),
    ).rejects.toThrow(/Invalid share amount/i);
    await expect(
      expense(group, "10", [{ userId: "not-a-uuid" }]),
    ).rejects.toThrow(/uuid/i);
    await expect(
      expense(group, "10", [{ userId: member }, { userId: member }]),
    ).rejects.toThrow(/Duplicate/i);
    await expect(expense(group, "10", [{ userId: outsider }])).rejects.toThrow(
      /not approved/i,
    );
    await expect(
      expense(
        group,
        "10",
        [{ userId: member, amount: "9" }] as never,
        "custom",
      ),
    ).rejects.toThrow(/sum/i);
    expect(
      (
        await asUser(owner, "select * from office_expenses where group_id=$1", [
          group,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(outsider, "select * from office_expenses where id=$1", [
          id,
        ])
      ).rows,
    ).toHaveLength(0);
    const usd = await groupWithMember("USD");
    const usdId = await expense(usd, "0.05");
    expect(
      (
        await asUser<{ amount: string }>(
          member,
          "select amount from office_shares where expense_id=$1 order by user_id",
          [usdId],
        )
      ).rows.map((r) => r.amount),
    ).toEqual(["0.02", "0.03"]);
  });

  it("allows creator edits before reporting and freezes shares after a rejected report", async () => {
    const group = await groupWithMember();
    const id = await expense(group);
    await rpc(owner, "save_expense", [
      id,
      group,
      "Đã sửa",
      "200",
      "2026-10-05",
      "even",
      JSON.stringify([{ userId: owner }, { userId: member }]),
      null,
    ]);
    await rpc(member, "payment_action", [id, "report", member]);
    await rpc(owner, "payment_action", [id, "reject", member]);
    await expect(
      rpc(owner, "save_expense", [
        id,
        group,
        "Sửa nợ",
        "300",
        "2026-10-05",
        "even",
        JSON.stringify([{ userId: owner }, { userId: member }]),
        null,
      ]),
    ).rejects.toThrow(/locked/i);
    await rpc(owner, "edit_expense_metadata", [
      id,
      "Ghi chú mới",
      "2026-10-06",
    ]);
    expect(
      (
        await asUser<{ payment_status: string }>(
          owner,
          "select payment_status from office_shares where expense_id=$1 and user_id=$2",
          [id, member],
        )
      ).rows[0].payment_status,
    ).toBe("pending");
  });

  it("requires report then creator confirmation, is idempotent, and preserves receipts on cancellation", async () => {
    const group = await groupWithMember();
    const id = await expense(group);
    await expect(
      rpc(owner, "payment_action", [id, "confirm", member]),
    ).rejects.toThrow(/reported/i);
    await expect(
      rpc(owner, "payment_action", [id, "report", member]),
    ).rejects.toThrow(/own payment/i);
    await rpc(member, "payment_action", [id, "report", member]);
    await rpc(member, "payment_action", [id, "report", member]);
    await expect(
      rpc(member, "payment_action", [id, "confirm", member]),
    ).rejects.toThrow(/creator/i);
    await rpc(owner, "payment_action", [id, "confirm", member]);
    await rpc(owner, "payment_action", [id, "confirm", member]);
    expect(
      (
        await asUser<{ status: string }>(
          member,
          "select status from office_expenses where id=$1",
          [id],
        )
      ).rows[0].status,
    ).toBe("completed");
    expect(
      (
        await asUser(
          owner,
          "select * from payment_events where expense_id=$1",
          [id],
        )
      ).rows,
    ).toHaveLength(2);
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claim.sub', '', true)");
        await tx.query("select cancel_expense($1,'Missing UID')", [id]);
      }),
    ).rejects.toThrow(/Authentication required/i);
    await expect(rpc(owner, "cancel_expense", [id, ""])).rejects.toThrow(
      /reason/i,
    );
    await rpc(owner, "cancel_expense", [id, "Đối soát hoàn tiền"]);
    expect(
      (
        await asUser<{ status: string }>(
          member,
          "select status from office_expenses where id=$1",
          [id],
        )
      ).rows[0].status,
    ).toBe("cancelled");
    expect(
      (
        await asUser<{ payment_status: string }>(
          member,
          "select payment_status from office_shares where expense_id=$1 and user_id=$2",
          [id, member],
        )
      ).rows[0].payment_status,
    ).toBe("confirmed");
    await expect(
      rpc(member, "payment_action", [id, "report", member]),
    ).rejects.toThrow(/cancelled/i);
  });

  it("keeps bank details private until the owner creates an expense, and validates normalized QR ownership", async () => {
    const group = await rpc<string>(owner, "create_group", [
      "Thông tin ngân hàng",
      "VND",
    ]);
    const token = (
      await asUser<{ invite_token: string }>(
        owner,
        "select invite_token from office_groups where id=$1",
        [group],
      )
    ).rows[0].invite_token;
    const request = await rpc<string>(outsider, "request_join", [token]);
    const qr = await rpc<{ id: string }>(owner, "register_upload", [
      null,
      "qr",
      "png",
    ]);
    await expect(
      rpc(owner, "save_bank_profile", [
        "VCB",
        "123456",
        "NGUYEN VAN A",
        "Thanh toan",
        qr.id,
      ]),
    ).rejects.toThrow(/Invalid QR/i);
    await db.query("update uploads set preview_path=path where id=$1", [qr.id]);
    await expect(
      rpc(outsider, "save_bank_profile", ["VCB", "123456", "X", "", qr.id]),
    ).rejects.toThrow(/Invalid QR/i);
    await rpc(owner, "save_bank_profile", [
      "VCB",
      "123456",
      "NGUYEN VAN A",
      "Thanh toan",
      qr.id,
    ]);
    expect(
      (
        await asUser(outsider, "select * from bank_profiles where user_id=$1", [
          owner,
        ])
      ).rows,
    ).toHaveLength(0);
    await rpc(owner, "decide_join", [request, true]);
    expect(
      (
        await asUser(outsider, "select * from bank_profiles where user_id=$1", [
          owner,
        ])
      ).rows,
    ).toHaveLength(0);
    await expense(group, "10", [{ userId: owner }, { userId: outsider }]);
    expect(
      (
        await asUser(outsider, "select * from bank_profiles where user_id=$1", [
          owner,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (await asUser(outsider, "select * from uploads where id=$1", [qr.id]))
        .rows,
    ).toHaveLength(1);
    await rpc(owner, "save_bank_profile", [
      "VCB",
      "654321",
      "NGUYEN VAN A",
      "",
      null,
    ]);
    expect(
      (
        await asUser<{ attached: boolean }>(
          owner,
          "select attached from uploads where id=$1",
          [qr.id],
        )
      ).rows[0].attached,
    ).toBe(false);
    expect(
      (await asUser(outsider, "select * from uploads where id=$1", [qr.id]))
        .rows,
    ).toHaveLength(0);
  });

  it("auto-completes self/zero shares and accepts exact custom amounts", async () => {
    const group = await groupWithMember();
    const self = await expense(group, "7", [{ userId: owner }]);
    expect(
      (
        await asUser<{ status: string }>(
          owner,
          "select status from office_expenses where id=$1",
          [self],
        )
      ).rows[0].status,
    ).toBe("completed");
    const zero = await expense(
      group,
      "7",
      [
        { userId: owner, amount: "7" },
        { userId: member, amount: "0" },
      ] as never,
      "custom",
    );
    expect(
      (
        await asUser<{ status: string }>(
          owner,
          "select status from office_expenses where id=$1",
          [zero],
        )
      ).rows[0].status,
    ).toBe("completed");
    await expect(
      rpc(owner, "save_expense", [
        null,
        group,
        "Empty",
        "7",
        "2026-10-05",
        "even",
        null,
        null,
      ]),
    ).rejects.toThrow(/Invalid shares/i);
    await expect(
      rpc(owner, "save_expense", [
        null,
        group,
        "Mode",
        "7",
        "2026-10-05",
        null,
        JSON.stringify([{ userId: owner }]),
        null,
      ]),
    ).rejects.toThrow(/Invalid shares/i);
  });

  it("protects notification contents while permitting own read markers", async () => {
    const group = await groupWithMember();
    await expense(group);
    const result = await asUser<{ id: string }>(
      member,
      "select id from notifications where group_id=$1",
      [group],
    );
    await asUser(member, "update notifications set read_at=now() where id=$1", [
      result.rows[0].id,
    ]);
    await expect(
      asUser(member, "update notifications set title='forged' where id=$1", [
        result.rows[0].id,
      ]),
    ).rejects.toThrow(/permission denied/i);
    expect(
      (
        await asUser(
          outsider,
          "select * from notifications where group_id=$1",
          [group],
        )
      ).rows,
    ).toHaveLength(0);
  });

  it("protects private image paths and prevents attaching uploads claimed for deletion", async () => {
    const group = await groupWithMember();
    const upload = await rpc<{ id: string; path: string }>(
      owner,
      "register_upload",
      [group, "receipt", "jpg"],
    );
    await asUser(
      owner,
      "insert into storage.objects(bucket_id,name) values('office-images',$1)",
      [upload.path],
    );
    await expect(
      asUser(
        member,
        "insert into storage.objects(bucket_id,name) values('office-images',$1)",
        [upload.path],
      ),
    ).rejects.toThrow(/row-level security/i);
    expect(
      (
        await asUser(member, "select * from storage.objects where name=$1", [
          upload.path,
        ])
      ).rows,
    ).toHaveLength(0);
    await db.query("update uploads set preview_path=path where id=$1", [
      upload.id,
    ]);
    const id = await rpc<string>(owner, "save_expense", [
      null,
      group,
      "Ảnh",
      "10",
      "2026-10-05",
      "even",
      JSON.stringify([{ userId: member }]),
      upload.id,
    ]);
    expect(
      (
        await asUser(member, "select * from storage.objects where name=$1", [
          upload.path,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(outsider, "select * from storage.objects where name=$1", [
          upload.path,
        ])
      ).rows,
    ).toHaveLength(0);
    await expect(
      rpc(member, "save_expense", [
        null,
        group,
        "Ảnh khác",
        "10",
        "2026-10-05",
        "even",
        JSON.stringify([{ userId: member }]),
        upload.id,
      ]),
    ).rejects.toThrow(/Invalid receipt/i);
    const stale = await rpc<{ id: string }>(owner, "register_upload", [
      group,
      "receipt",
      "png",
    ]);
    await db.query(
      "update uploads set created_at=now()-interval '2 days' where id=$1",
      [stale.id],
    );
    await expect(
      rpc(owner, "claim_cleanup_uploads", ["2026-10-06", 100]),
    ).rejects.toThrow(/permission denied/i);
    await db.transaction(async (tx) => {
      await tx.exec("set local role service_role");
      await tx.query(
        "select * from claim_cleanup_uploads(now()-interval '24 hours',100)",
      );
    });
    await expect(
      rpc(owner, "save_expense", [
        null,
        group,
        "Ảnh xóa",
        "10",
        "2026-10-05",
        "even",
        JSON.stringify([{ userId: member }]),
        stale.id,
      ]),
    ).rejects.toThrow(/Invalid receipt/i);
    expect(
      (await asUser(owner, "select * from office_expenses where id=$1", [id]))
        .rows,
    ).toHaveLength(1);
  });

  it("enforces OCR ownership, one active lease and ten starts per minute", async () => {
    const group = await groupWithMember();
    const upload = await rpc<{ id: string }>(outsider, "register_upload", [
      null,
      "qr",
      "jpg",
    ]);
    await expect(rpc(owner, "begin_ocr", [upload.id])).rejects.toThrow(
      /Invalid OCR/i,
    );
    const receipt = await rpc<{ id: string }>(owner, "register_upload", [
      group,
      "receipt",
      "jpg",
    ]);
    await db.query("update uploads set preview_path=path where id=$1", [
      receipt.id,
    ]);
    const first = await rpc<string>(owner, "begin_ocr", [receipt.id]);
    await expect(rpc(owner, "begin_ocr", [receipt.id])).rejects.toThrow(
      /already running/i,
    );
    await expect(rpc(member, "finish_ocr", [first])).rejects.toThrow(/owner/i);
    await rpc(owner, "finish_ocr", [first]);
    for (let n = 1; n < 10; n++) {
      const lease = await rpc<string>(owner, "begin_ocr", [receipt.id]);
      await rpc(owner, "finish_ocr", [lease]);
    }
    await expect(rpc(owner, "begin_ocr", [receipt.id])).rejects.toThrow(
      /rate limit/i,
    );
  });
});
