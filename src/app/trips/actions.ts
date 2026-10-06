"use server";
import { redirect } from "next/navigation";
import type { TripSummary } from "@/lib/trips";
export interface TripFormState {
  error?: string;
  ok?: boolean;
  memberId?: number;
}
const retired = "Luồng chuyến đi cũ đã đóng. Hãy đăng nhập và tạo nhóm mới.";
export async function createTripAction(): Promise<TripFormState> {
  return { error: retired };
}
export async function addParticipantAction(): Promise<TripFormState> {
  return { error: retired };
}
export async function closeTripAction(): Promise<void> {
  redirect("/");
}
export async function fetchTripSummariesAction(
  publicIds: string[],
): Promise<
  Pick<
    TripSummary,
    "public_id" | "name" | "currency" | "status" | "memberCount"
  >[]
> {
  void publicIds;
  return [];
}
