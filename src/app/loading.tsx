export default function Loading() {
  return (
    <main className="loading-page" role="status" aria-label="Đang tải nội dung">
      <p className="loading-label">Đang tải…</p>
      <div aria-hidden="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-copy" />
        <div className="skeleton-cards">
          {[1, 2, 3].map((i) => (
            <div className="skeleton-card" key={i}>
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ))}
        </div>
        <div className="skeleton skeleton-panel" />
      </div>
    </main>
  );
}
