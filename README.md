# CandyPot 🍬

Sổ ghi kẹo cho nhóm bạn chơi bài ngoài đời: nhập kết quả mỗi ván, app tính lời/lỗ và cách trả kẹo ít lượt nhất.

- Game: **Tiến lên miền Nam**, **Xì dách** (có nhà cái), **Poker** (có pot, tính side pot)
- Bàn oval tối đa 10 người, bạn ngồi dưới cùng: mở ván đặt cược → **kéo hũ kẹo** thả vào người nhận (popup 3 số: cược × 1 / × 1,5 / × 2) → chốt ván
- **Lịch sử trả/nhận** của riêng bạn (nút 📜 góc bàn); hoàn tác cần **host** xác nhận
- **Đòi kẹo:** kéo hũ kẹo của người khác về chỗ mình → người đó nhận thông báo, bấm OK mới chuyển
- **Bầu host:** host vắng thì mọi người bấm 🛎️ ở màn Người chơi để bầu host mới — đủ 2 phiếu là thành host. Host thì chuyển host thẳng, không cần vote.
- **Nút Host và Yêu cầu** (góc phải dưới bàn chơi, ai cũng có, có số đếm): *Host* — host duyệt yêu cầu hoàn tác (từng cái hoặc OK tất cả) và theo dõi lời đòi giữa mọi người; người khác xem yêu cầu hoàn tác của mình đang chờ và rút lại được. *Yêu cầu* — ai đang đòi bạn (Không/OK, OK tất cả) và bạn đang đòi ai. Thông báo trên cùng có "Để sau" để không bị che bàn.
- **Tiến lên:** host bấm ô **Rule** giữa bàn để đặt mức Nhất/Nhì — đó là các số gợi ý khi kéo trả kẹo; nhập một ô thì ô kia tự tính (Nhất = 2 × Nhì), vẫn sửa riêng được. Chọn game (Tiến lên / Xì dách / Poker / Lô tô — Lô tô tạm để trống) ở ô chọn đầu bàn: đổi game chỉ là đổi cách tính, lời/lỗ của cả bàn vẫn cộng dồn.
- Tiến lên cược 2 mức Nhất / Nhì (vd 4/2); Xì dách: đặt cược bằng **ô Bet** giữa bàn → **Chốt cược** → chia bài, kéo trả kẹo → **Kết thúc** (một nút đổi chữ theo bước; ván sau tự giữ cược cũ)
- Lời/lỗ cộng dồn từ 0, lịch sử theo ván / theo người, danh hiệu, luật nhà
- Web app (PWA) — thêm vào màn hình chính, chạy offline, dữ liệu lưu trên máy

Thiết kế: [docs/superpowers/specs/2026-09-29-candypot-design.md](docs/superpowers/specs/2026-09-29-candypot-design.md)

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # test phần tính kẹo (src/core)
npm run build    # bản production + service worker trong dist/
```

### Shortcut khung điện thoại (Windows)

```bash
powershell -ExecutionPolicy Bypass -File scripts/create-shortcut.ps1
```

Tạo 3 shortcut trên Desktop: **CandyPot** (app), **CandyPot Demo 6 nguoi** (bàn mẫu 6 người, bạn là Minh, đang mở sẵn ván Xì dách — mở `/demo?reset=1` để dựng lại từ đầu) và **CandyPot Demo (An)** (cùng bàn đó nhưng nhìn từ An — mở song song để thử đòi kẹo giữa 2 "máy"; các cửa sổ tự đồng bộ).

Shortcut Bấm vào sẽ tự bật `npm run dev` (cửa sổ thu nhỏ, nếu chưa chạy) và mở app bằng Edge ở chế độ app, khung 400×880. Sửa code là app tự cập nhật (hot reload). Dữ liệu của cửa sổ này nằm trong profile riêng `%LOCALAPPDATA%\CandyPot\browser-profile`.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/core/` | Luật game, sổ cái, thuật toán trả kẹo, danh hiệu — thuần TypeScript, có test |
| `src/storage/` | Lưu trữ (`LocalRepo` = localStorage) |
| `src/store/` | State app (Zustand) |
| `src/ui/` | Màn hình và form nhập ván |
