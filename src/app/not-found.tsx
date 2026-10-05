import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="card">
        <h1>Không tìm thấy nội dung</h1>
        <p className="muted">
          Liên kết không tồn tại hoặc bạn chưa có quyền truy cập.
        </p>
        <Link href="/" className="back-link">
          Về danh sách nhóm
        </Link>
      </section>
    </main>
  );
}
