"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverSupabase, requireUser } from "@/lib/supabase/server";
import { appUrl, safeNext, supabaseConfigured } from "@/lib/supabase/config";

export interface AuthState {
  error?: string;
  message?: string;
}
const credentials = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export async function authenticate(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!supabaseConfigured())
    return {
      error: "Chưa cấu hình Supabase. Điền các biến trong .env.example trước.",
    };
  const mode = String(form.get("mode"));
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? "/"));
  const supabase = await serverSupabase();
  if (mode === "forgot") {
    if (!z.email().safeParse(email).success)
      return { error: "Nhập địa chỉ email hợp lệ." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl()}/auth/confirm?next=/reset-password`,
    });
    if (error) return { error: "Chưa gửi được email. Vui lòng thử lại sau." };
    return {
      message:
        "Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu.",
    };
  }
  if (!credentials.safeParse({ email, password }).success)
    return { error: "Nhập email hợp lệ và mật khẩu từ 8 đến 128 ký tự." };
  if (mode === "signup") {
    const name = String(form.get("name") ?? "").trim();
    if (!name || name.length > 100)
      return { error: "Tên hiển thị phải từ 1 đến 100 ký tự." };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${appUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    if (error)
      return {
        error: "Không thể đăng ký. Kiểm tra thông tin hoặc thử lại sau.",
      };
    return {
      message: "Kiểm tra hộp thư để xác minh tài khoản, rồi đăng nhập.",
    };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error)
    return {
      error: "Email hoặc mật khẩu chưa đúng, hoặc email chưa được xác minh.",
    };
  revalidatePath("/", "layout");
  redirect(next);
}

export async function googleSignIn(form: FormData) {
  if (!supabaseConfigured()) redirect("/login?setup=1");
  const supabase = await serverSupabase();
  const next = safeNext(String(form.get("next") ?? "/"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  if (supabaseConfigured()) {
    const supabase = await serverSupabase();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function changePassword(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const { supabase } = await requireUser("/reset-password");
  const password = String(form.get("password") ?? "");
  if (password.length < 8 || password.length > 128)
    return { error: "Mật khẩu phải từ 8 đến 128 ký tự." };
  if (password !== form.get("confirmation"))
    return { error: "Hai mật khẩu không khớp." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error)
    return { error: "Không thể đổi mật khẩu. Vui lòng yêu cầu liên kết mới." };
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?password=updated");
}
