import type { Metadata } from "next";
import PublicPage, { supportEmail } from "../components/PublicPage";

export const metadata: Metadata = {
  title: "Quyền riêng tư | Chia tiền văn phòng",
};

export default function Privacy() {
  return (
    <PublicPage>
      <article className="card">
        <h1>Chính sách quyền riêng tư</h1>
        <p className="muted">Cập nhật: 05/10/2026</p>
        <p>
          Chia tiền văn phòng là ứng dụng ghi chi phí nhóm và theo dõi hoàn trả,
          do người vận hành liên hệ tại{" "}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a> quản lý.
        </p>
        <h2>Dữ liệu được sử dụng</h2>
        <p>
          Ứng dụng lưu email, mã tài khoản và tên hiển thị; nhóm và thành viên;
          chi phí, phần chia, trạng thái thanh toán và lịch sử xác nhận. Nếu bạn
          cung cấp, ứng dụng còn lưu thông tin tài khoản ngân hàng, nội dung
          chuyển khoản, QR và ảnh hóa đơn.
        </p>
        <p>
          Khi đăng nhập Google, Supabase xử lý thông tin nhận diện cơ bản như mã
          tài khoản, email và hồ sơ Google. App sử dụng thông tin này để đăng
          nhập và nhận diện thành viên, không yêu cầu quyền truy cập Gmail,
          Google Drive hay danh bạ.
        </p>
        <h2>Mục đích và người có thể xem</h2>
        <p>
          Dữ liệu được dùng để cung cấp đăng nhập, quản lý nhóm, chia chi phí,
          xác nhận hoàn trả, thống kê và hỗ trợ. Thành viên được duyệt xem dữ
          liệu nhóm theo quyền của mình; người có quyền đối với expense có thể
          xem thông tin chuyển khoản của người ứng tiền. Không tải lên thông tin
          bạn không muốn chia sẻ với những người có quyền trong nhóm.
        </p>
        <h2>Dịch vụ xử lý dữ liệu</h2>
        <p>
          Vercel phục vụ website và API; Supabase lưu tài khoản, database và
          ảnh. Dịch vụ SMTP do người vận hành cấu hình gửi email xác minh và
          khôi phục. Các dịch vụ có thể xử lý thông tin kỹ thuật như địa chỉ IP
          và log vận hành theo cấu hình và chính sách của họ.
        </p>
        <p>
          Chỉ khi bạn chọn quét hóa đơn, ảnh phục vụ quét được gửi tới Groq để
          trích xuất thông tin. Bạn có thể nhập tay thay vì quét. Không gửi hóa
          đơn chứa thông tin không cần thiết hoặc dữ liệu nhạy cảm mà bạn không
          muốn dịch vụ xử lý.
        </p>
        <p>
          Người vận hành không bán dữ liệu Google và không sử dụng dữ liệu
          Google cho quảng cáo. Dữ liệu được chia sẻ với nhà cung cấp để thực
          hiện các chức năng nêu trên và khi cần tuân thủ yêu cầu pháp luật.
        </p>
        <h2>Lưu trữ và bảo vệ</h2>
        <p>
          App sử dụng cookie để duy trì phiên đăng nhập. Ảnh được lưu trong
          bucket riêng tư; quyền xem được kiểm tra và liên kết ảnh có thời hạn.
          Người vận hành có quyền quản trị để vận hành và hỗ trợ dịch vụ.
        </p>
        <p>
          Dữ liệu gắn với nhóm và expense được giữ để đối chiếu cho đến khi
          người vận hành xử lý yêu cầu xóa phù hợp. Hủy expense giữ lịch sử
          thanh toán và không tự xóa dữ liệu. Ảnh chưa gắn vào dữ liệu được đưa
          vào quy trình dọn dẹp sau 24 giờ, tùy lịch chạy và trạng thái dịch vụ.
          Bản sao lưu và log có thể tồn tại theo cấu hình nhà cung cấp.
        </p>
        <h2>Yêu cầu truy cập, sửa hoặc xóa</h2>
        <p>
          Bạn có thể sửa hồ sơ trong app và gửi yêu cầu truy cập, xuất hoặc xóa
          dữ liệu tới <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          Người vận hành sẽ xác minh quyền sở hữu tài khoản và trao đổi phạm vi
          xử lý, kể cả dữ liệu chung cần giữ để đối chiếu. Hiện app chưa có nút
          tự xóa tài khoản.
        </p>
        <p>
          Bạn có thể thu hồi quyền Google trong phần kết nối ứng dụng bên thứ ba
          của tài khoản Google; thao tác này không tự xóa dữ liệu đã lưu trong
          app.
        </p>
        <h2>Thay đổi và liên hệ</h2>
        <p>
          Chính sách có thể được cập nhật khi chức năng hoặc nhà cung cấp thay
          đổi. Ngày cập nhật được hiển thị trên trang này. Liên hệ:{" "}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </article>
    </PublicPage>
  );
}
