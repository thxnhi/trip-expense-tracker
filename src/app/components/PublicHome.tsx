import Link from "next/link";
import PublicPage from "./PublicPage";
import OfficeIcon, { type OfficeIconName } from "./OfficeIcon";
const features: { icon: OfficeIconName; title: string; description: string }[] =
  [
    {
      icon: "groups",
      title: "Một nhóm, cùng chia sẻ",
      description:
        "Tạo nhóm, gửi link mời và duyệt đồng nghiệp. Chọn đúng những người cùng tham gia khoản chi.",
    },
    {
      icon: "camera",
      title: "Chụp ảnh, bớt nhập liệu",
      description:
        "Chụp hóa đơn trên điện thoại hoặc chọn ảnh. Quét số tiền, ngày và tên cửa hàng rồi kiểm tra trước khi lưu.",
    },
    {
      icon: "bank",
      title: "Chuyển tiền thuận tiện",
      description:
        "Thêm số tài khoản, nội dung chuyển khoản và QR ngân hàng để đồng nghiệp dễ dàng hoàn trả.",
    },
    {
      icon: "chart",
      title: "Biết rõ từng khoản tiền",
      description:
        "Xem tổng chi, tiền đã nhận và phần còn thiếu. Theo dõi khoản của bạn theo nhóm và khoảng thời gian.",
    },
  ];
export default function PublicHome() {
  return (
    <PublicPage>
      <div className="landing">
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="hero-pill">
              <span />
              Dành cho những khoản chi cùng đồng nghiệp
            </p>
            <h1>Chia tiền văn phòng</h1>
            <p className="hero-tagline">
              Chi chung nhẹ nhàng.
              <br />
              <span>Rõ ràng đến từng người.</span>
            </p>
            <p className="hero-description">
              Từ bữa trưa đến ly cà phê, ghi lại khoản bạn đã ứng, chia đúng
              người và theo dõi từng lần hoàn trả — ngay trên máy tính hoặc điện
              thoại.
            </p>
            <Link className="button-link hero-cta" href="/login">
              Đăng nhập hoặc tạo tài khoản <OfficeIcon name="arrow" size={19} />
            </Link>
            <div className="hero-trust">
              <span>
                <OfficeIcon name="shield" size={16} />
                Riêng tư trong nhóm
              </span>
              <span>
                <OfficeIcon name="phone" size={16} />
                Dùng ngay trên web
              </span>
            </div>
          </div>
          <div
            className="hero-preview"
            aria-label="Minh họa cách chia một khoản chi"
          >
            <div className="preview-label">
              <span className="preview-live-dot" />
              MINH HỌA KHOẢN CHI
            </div>
            <div className="demo-expense">
              <div className="demo-expense-top">
                <span className="demo-icon">
                  <OfficeIcon name="receipt" size={25} />
                </span>
                <span className="badge badge-completed">
                  <OfficeIcon name="check" size={12} />
                  Hoàn tất
                </span>
              </div>
              <p className="demo-expense-title">Bữa trưa cùng nhóm</p>
              <strong className="demo-amount">
                360.000 <span>₫</span>
              </strong>
              <div className="demo-divider" />
              <div className="demo-split-head">
                <span>Chia đều cho 3 người</span>
                <span>120.000 ₫ / người</span>
              </div>
              {[
                {
                  name: "Bạn",
                  initial: "B",
                  status: "Đã ứng tiền",
                  color: "blue",
                },
                {
                  name: "Minh",
                  initial: "M",
                  status: "Đã xác nhận",
                  color: "pink",
                },
                {
                  name: "Linh",
                  initial: "L",
                  status: "Đã xác nhận",
                  color: "teal",
                },
              ].map((person) => (
                <div className="demo-person" key={person.name}>
                  <span className={`mini-avatar avatar-${person.color}`}>
                    {person.initial}
                  </span>
                  <strong>{person.name}</strong>
                  <span className="demo-person-status">
                    {person.status}
                    <OfficeIcon name="check" size={14} />
                  </span>
                </div>
              ))}
              <div className="demo-progress">
                <span />
                <span />
                <span />
              </div>
              <p className="demo-complete">
                <OfficeIcon name="check" size={15} />
                Mọi khoản hoàn trả đã được xác nhận
              </p>
            </div>
            <div className="demo-note">
              <span className="demo-note-icon">
                <OfficeIcon name="camera" size={19} />
              </span>
              <div>
                <strong>Từ ảnh hóa đơn đến khoản chi</strong>
                <span>Quét nhanh · Kiểm tra lại · Lưu expense</span>
              </div>
            </div>
          </div>
        </section>
        <section className="landing-steps" aria-label="Cách sử dụng">
          <div>
            <span>01</span>
            <strong>Tạo nhóm</strong>
            <p>Mời những người cùng chi.</p>
          </div>
          <OfficeIcon name="arrow" />
          <div>
            <span>02</span>
            <strong>Thêm khoản chi</strong>
            <p>Chia đều hoặc nhập phần riêng.</p>
          </div>
          <OfficeIcon name="arrow" />
          <div>
            <span>03</span>
            <strong>Xác nhận hoàn trả</strong>
            <p>Ai đã chuyển, ai đã nhận đều rõ.</p>
          </div>
        </section>
        <section className="landing-features" id="features">
          <div className="landing-section-heading">
            <p className="eyebrow">ÍT THAO TÁC, NHIỀU RÕ RÀNG</p>
            <h2>Từ hóa đơn đến xác nhận thanh toán</h2>
            <p>Mọi việc cần cho khoản chi chung, ở cùng một nơi.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <OfficeIcon name={feature.icon} size={25} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-transparency">
          <div className="transparency-icon">
            <OfficeIcon name="shield" size={30} />
          </div>
          <div>
            <h2>Đăng nhập và dữ liệu</h2>
            <p>
              Đăng nhập bằng Google hoặc email và mật khẩu. Google chỉ cung cấp
              thông tin nhận diện cơ bản; ứng dụng không yêu cầu đọc Gmail,
              Drive hay danh bạ.
            </p>
            <p>
              Khi bạn bấm quét, ảnh hóa đơn được gửi đến Groq để đọc nội dung.
              Bạn kiểm tra kết quả trước khi lưu, hoặc nhập tay bất cứ lúc nào.
              Việc chuyển tiền thực hiện qua ngân hàng của bạn.
            </p>
          </div>
        </section>
        <section className="landing-final">
          <div>
            <h2>Khoản chi tiếp theo, cùng chia nhé?</h2>
            <p>Tạo nhóm của bạn và bắt đầu từ một khoản chi.</p>
          </div>
          <Link className="button-link" href="/login">
            Bắt đầu sử dụng <OfficeIcon name="arrow" size={18} />
          </Link>
        </section>
      </div>
    </PublicPage>
  );
}
