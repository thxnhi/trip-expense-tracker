"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "./config";

export function browserSupabase() {
  const { url, key } = publicSupabaseConfig();
  return createBrowserClient(url, key);
}
