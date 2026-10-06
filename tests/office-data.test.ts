import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ requireUser: mocks.requireUser }));
import { groupMembersData } from "../src/lib/office-data";

const groupId = "ea1f6e68-d46b-4149-8186-2b57bfe80483";
const memberId = (index: number) =>
  `f0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

beforeEach(() => vi.resetAllMocks());

describe("expense form group data", () => {
  it("includes every approved member and name beyond the database page limit", async () => {
    const members = Array.from({ length: 502 }, (_, index) => ({
      group_id: groupId,
      user_id: memberId(index),
      joined_at: "2026-10-05T00:00:00Z",
    }));
    const names = new Map(
      members.map((member, index) => [member.user_id, `Thành viên ${index}`]),
    );
    const client = {
      from(table: string) {
        let selectedIds: string[] = [];
        const query = {
          select() {
            return query;
          },
          eq() {
            return query;
          },
          order() {
            return query;
          },
          in(_column: string, ids: string[]) {
            selectedIds = ids;
            return query;
          },
          async maybeSingle() {
            return {
              data: {
                id: groupId,
                name: "Văn phòng",
                currency: "VND",
                owner_id: memberId(0),
              },
              error: null,
            };
          },
          async range(start: number, end: number) {
            return { data: members.slice(start, end + 1), error: null };
          },
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve({
              data: selectedIds.map((id) => ({ id, name: names.get(id) })),
              error: null,
            }).then(resolve);
          },
        };
        if (!["office_groups", "group_members", "profiles"].includes(table))
          throw new Error(
            "An unrelated history table must not prevent opening the expense form.",
          );
        return query;
      },
    };
    mocks.requireUser.mockResolvedValue({
      supabase: client,
      user: { id: memberId(0) },
    });
    const result = await groupMembersData(groupId);
    expect(result?.members).toHaveLength(502);
    expect(result?.members[0].profile?.name).toBe("Thành viên 0");
    expect(result?.members[501].profile?.name).toBe("Thành viên 501");
    expect(result?.group.currency).toBe("VND");
  });

  it("does not expose members when RLS hides the group", async () => {
    const from = vi.fn(() => {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        async maybeSingle() {
          return { data: null, error: null };
        },
      };
      return query;
    });
    mocks.requireUser.mockResolvedValue({
      supabase: { from },
      user: { id: memberId(999) },
    });
    expect(await groupMembersData(groupId)).toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("office_groups");
  });
});
