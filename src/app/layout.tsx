import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Session-dependent pages must never become cached redirects during an env-less build.
export const dynamic = "force-dynamic";

// Geist / Geist Mono: a clean neo-grotesque pairing that echoes the OpenAI
// "Supply Co." aesthetic — a crisp humanist sans for display + body, and a
// monospace used for the small uppercase eyebrow / section labels. Both are
// variable fonts, so the full weight range is available.
const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chia tiền văn phòng",
  description:
    "Ghi chi phí nhóm, chia tiền và xác nhận chuyển khoản trên PC và điện thoại.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
