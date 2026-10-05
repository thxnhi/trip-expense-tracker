import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Luồng chuyến đi công khai đã đóng. Hãy đăng nhập và quét hóa đơn trong nhóm.",
    },
    { status: 410 },
  );
}
