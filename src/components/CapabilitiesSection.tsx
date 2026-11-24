export function CapabilitiesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 py-16 sm:py-20 border-t border-white/[0.06]"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
            Thiết kế riêng cho game thủ, nhẹ và ổn định
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-400">
            Mọi lớp kỹ thuật phức tạp được đóng gói gọn vào một bộ cài đặt duy nhất — bạn chỉ việc mở lên, chọn máy chủ và nhấn kết nối.
          </p>
        </div>

        {/* Asymmetric Editorial Bento Grid (No 3-column icon triad) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <article className="md:col-span-7 rounded-2xl border border-white/[0.08] bg-[#131722] p-7 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs font-semibold text-indigo-400">01. Định tuyến tầng TUN</p>
              <h3 className="mt-2 text-xl font-bold text-white">
                Bắt trọn gói tin UDP của game, điều mà Proxy trình duyệt không làm được
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Các tựa game như Roblox, Genshin Impact hay Valorant truyền dữ liệu thời gian thực qua giao thức UDP. PingGate tạo card mạng ảo TUN siêu nhẹ bằng lõi sing-box để bắt trực tiếp lưu lượng từ file chạy của game, giảm mất gói và giật lag rõ rệt.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.07] pt-4 text-xs text-slate-300">
              <span>Hỗ trợ TCP & UDP</span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>Chống rò rỉ DNS khi vượt vùng</span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>Tự khôi phục mạng khi thoát app</span>
            </div>
          </article>

          <article className="md:col-span-5 rounded-2xl border border-white/[0.08] bg-[#131722] p-7 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs font-semibold text-indigo-400">02. Giữ băng thông gốc</p>
              <h3 className="mt-2 text-xl font-bold text-white">
                Discord, YouTube và trình duyệt vẫn chạy mạng nội địa
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Không còn cảnh bật VPN chơi game rồi nghe nhạc hay xem livestream bị chậm theo. Quy tắc mặc định giữ toàn bộ ứng dụng ngoài danh sách game đi thẳng qua nhà mạng của bạn.
              </p>
            </div>
            <p className="border-t border-white/[0.07] pt-4 text-xs text-slate-400">
              Chuyển đổi 1 chạm giữa Riêng Game và Toàn bộ máy bất cứ lúc nào.
            </p>
          </article>

          <article className="md:col-span-5 rounded-2xl border border-white/[0.08] bg-[#131722] p-7 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs font-semibold text-indigo-400">03. Tự do chọn máy chủ</p>
              <h3 className="mt-2 text-xl font-bold text-white">
                Dùng sẵn máy chủ miễn phí hoặc dán link VPS cá nhân
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Hỗ trợ chuẩn phổ biến nhất hiện nay gồm VLESS Reality, Trojan, VMess và Shadowsocks. Chỉ cần dán link từ Clipboard là ứng dụng tự giải mã và đo ping.
              </p>
            </div>
            <p className="border-t border-white/[0.07] pt-4 text-xs text-slate-400">
              Dữ liệu máy chủ lưu cục bộ trên máy của bạn, không yêu cầu tài khoản.
            </p>
          </article>

          <article className="md:col-span-7 rounded-2xl border border-white/[0.08] bg-[#131722] p-7 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs font-semibold text-indigo-400">04. Cài đặt 1 chạm</p>
              <h3 className="mt-2 text-xl font-bold text-white">
                Tải 1 tệp duy nhất, tự động cài lõi mạng và sẵn sàng kết nối
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Không cần tự viết tệp cấu hình JSON hay cấu hình dòng lệnh phức tạp. Bộ cài tải từ website đã đính kèm sẵn máy chủ bạn chọn, danh sách game tách luồng và cầu nối giúp bạn điều khiển trực tiếp ngay trên trình duyệt.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.07] pt-4 text-xs text-slate-300">
              <span>Windows 10 / 11 (64-bit)</span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>macOS (Apple Silicon & Intel)</span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>Kèm công cụ xuất file .exe độc lập</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
