import type { Metadata } from "next";
import PublicPage, { supportEmail } from "../components/PublicPage";

export const metadata: Metadata = { title: "Điều khoản | Chia tiền văn phòng" };

export default function Terms() {
  return (
    <PublicPage>
      <article className="card">
        <h1>Điều khoản sử dụng</h1>
        <p className="muted">Cập nhật: 05/10/2026</p>
        <p>
          Khi sử dụng Chia tiền văn phòng, bạn đồng ý sử dụng ứng dụng để ghi
          chép chi phí và đối chiếu hoàn trả với những người tham gia.
        </p>
        <h2>Tài khoản và nội dung</h2>
        <p>
          Bảo vệ thông tin đăng nhập và chỉ nhập dữ liệu bạn có quyền sử dụng.
          Bạn chịu trách nhiệm về tính chính xác của chi phí, phần chia, thông
          tin ngân hàng và ảnh đã tải lên. Không sử dụng app để giả mạo, lừa
          đảo, truy cập dữ liệu trái phép hoặc làm gián đoạn dịch vụ.
        </p>
        <h2>Thanh toán và xác nhận</h2>
        <p>
          App không giữ tiền hay thực hiện chuyển khoản. Bạn chuyển tiền qua
          dịch vụ ngân hàng và kiểm tra người nhận, số tiền trước khi chuyển.
          Báo đã chuyển là thông báo của thành viên; người ứng tiền cần đối
          chiếu giao dịch thật trước khi xác nhận. Các bên tự trao đổi để giải
          quyết khoản chuyển sai hoặc tranh chấp.
        </p>
        <h2>Ảnh và kết quả quét</h2>
        <p>
          Quét hóa đơn là chức năng hỗ trợ và có thể đọc sai. Kiểm tra số tiền,
          ngày, nội dung và người được chia trước khi lưu. Không coi kết quả OCR
          hoặc thống kê là chứng từ ngân hàng hay tư vấn kế toán.
        </p>
        <h2>Dữ liệu và dịch vụ</h2>
        <p>
          Việc xử lý dữ liệu được mô tả trong chính sách quyền riêng tư. Chức
          năng có thể thay đổi hoặc tạm gián đoạn do bảo trì và dịch vụ nhà cung
          cấp. Người vận hành có thể hạn chế tài khoản vi phạm hoặc gây ảnh
          hưởng đến người khác. Hãy giữ chứng từ cần thiết để đối chiếu độc lập.
        </p>
        <h2>Hỗ trợ và thay đổi</h2>
        <p>
          Liên hệ <a href={`mailto:${supportEmail}`}>{supportEmail}</a> để báo
          lỗi, yêu cầu hỗ trợ hoặc xử lý dữ liệu. Điều khoản có thể được cập
          nhật; phiên bản hiện tại và ngày cập nhật được công bố tại trang này.
        </p>
      </article>
    </PublicPage>
  );
}
