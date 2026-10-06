"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page">
      <section className="card">
        <h1>Chưa tải được dữ liệu</h1>
        <p className="muted">
          Kiểm tra kết nối và thử lại. Nếu lỗi tiếp tục, hãy liên hệ người quản
          lý ứng dụng.
        </p>
        <button onClick={reset}>Thử lại</button>
      </section>
    </main>
  );
}
