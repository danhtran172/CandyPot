# CandyPot 🍬

Sổ ghi kẹo cho nhóm bạn chơi bài ngoài đời: nhập kết quả mỗi ván, app tính lời/lỗ và cách trả kẹo ít lượt nhất.

- Game: **Tiến lên miền Nam**, **Xì dách** (có nhà cái), **Poker** (có pot, tính side pot)
- Bàn oval tối đa 10 người, bạn ngồi dưới cùng: mở ván đặt cược → **kéo gói kẹo** thả vào người nhận (popup 3 số: cược × 1 / × 1,5 / × 2) → chốt ván
- **Lịch sử trả/nhận** của riêng bạn (nút 📜 góc bàn); hoàn tác cần **host** xác nhận
- **Bấm là xong:** bấm một người để đưa kẹo cho họ (⇄ để đòi), bấm Pot để bỏ kẹo / mua tờ / (host) trao pot, bấm Bet để cược, bấm 🎩 để đổi cái, bấm chính mình để xem Trả/nhận. Kéo thả vẫn dùng được.
- **Đòi kẹo:** kéo gói kẹo của người khác về chỗ mình → người đó nhận thông báo, bấm OK mới chuyển
- **Poker như game thật:** nút D xoay vòng, tự bỏ SB/BB, các vòng Preflop → Flop → Turn → River → Showdown theo lượt; nút Bỏ bài / Theo / Tố / All-in (all-in mặc định 10 × SB); chip trên bàn; showdown chỉ cần bấm người bài mạnh nhất — app tự chia pot chính / pot phụ (all-in thiếu, hòa); ↩ hoàn tác; ⚙ (host) chỉnh small blind và mức all-in.
- **Lô tô:** host đặt **Giá** (mỗi tờ) giữa bàn → mọi người kéo mình vào 💰 Pot, chọn số tờ (app tự tính kẹo) → **Chốt** → host kéo Pot vào người thắng, xác nhận → **Ván mới**.
- **Tự do:** một 💰 Pot để cược (luôn hiện mỗi người đã cược bao nhiêu), kéo Pot vào người thắng để trao thưởng, gửi kẹo cho nhau thoải mái.
- **Rule ? và ⚙:** giữa bàn có nút hồng **Rule ?** để ai cũng xem luật; host bấm ⚙ góc bàn để chỉnh — Tiến lên: Nhất / Nhì / heo đỏ / heo đen; Lô tô: giá + tối đa số tờ; Xì dách: min / max cược; Poker: small blind + all-in.
- **Hướng dẫn:** nút **?** cạnh Người chơi → chọn Người chơi / Host → tour chỉ thẳng vào từng nút trên bàn theo mode đang chơi. Lần đầu chơi (hoặc lần đầu làm host) một mode thì tự hiện.
- **Tạo bàn / Join bàn:** tạo bàn kiểu **Một máy** (host ghi hết) hoặc **Nhiều người join** (mã 5 số + mã QR / link). Người khác bấm **Join bàn** nhập mã (hoặc quét QR) → chọn "Bạn là ai?" → mọi thao tác đồng bộ tức thì giữa các điện thoại (Firebase). Mất mạng thì hiện banner, thay đổi gửi khi có mạng lại.
- **Nhắc lại (🔔):** lời đòi / xin hoàn tác còn chờ thì bấm 🔔 Nhắc — thông báo bật lại bên kia (cách nhau ít nhất 30 giây).
- **Quay lại ván trước:** host bấm ⏮ cạnh nút chính để mở lại ván vừa chốt và sửa.
- **Bầu host:** host vắng thì mọi người bấm 🛎️ ở màn Người chơi để bầu host mới — đủ 2 phiếu là thành host. Host thì chuyển host thẳng, không cần vote.
- **Nút Host và Yêu cầu** (góc phải dưới bàn chơi, ai cũng có, có số đếm): *Host* — host duyệt yêu cầu hoàn tác (từng cái hoặc OK tất cả) và theo dõi lời đòi giữa mọi người; người khác xem yêu cầu hoàn tác của mình đang chờ và rút lại được. *Yêu cầu* — ai đang đòi bạn (Không/OK, OK tất cả) và bạn đang đòi ai. Thông báo trên cùng có "Để sau" để không bị che bàn.
- **Tiến lên:** host bấm ô **Rule** giữa bàn để đặt mức Nhất/Nhì — đó là các số gợi ý khi kéo trả kẹo; nhập một ô thì ô kia tự tính (Nhất = 2 × Nhì), vẫn sửa riêng được. Chọn game (Tiến lên / Xì dách / Poker / Lô tô / Tự do) ở ô chọn đầu bàn: đổi game chỉ là đổi cách tính, lời/lỗ của cả bàn vẫn cộng dồn.
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

Tạo 3 shortcut trên Desktop: **CandyPot** (app), **CandyPot Demo 6 nguoi** (bàn mẫu 6 người, bạn là Minh, đang mở sẵn ván Xì dách — mở `/demo?reset=1` để dựng lại từ đầu, `/demo?host=1` để lấy lại quyền host mà không mất dữ liệu) và **CandyPot Demo (An)** (cùng bàn đó nhưng nhìn từ An — mở song song để thử đòi kẹo giữa 2 "máy"; các cửa sổ tự đồng bộ).

Shortcut Bấm vào sẽ tự bật `npm run dev` (cửa sổ thu nhỏ, nếu chưa chạy) và mở app bằng Edge ở chế độ app, khung 400×880. Sửa code là app tự cập nhật (hot reload). Dữ liệu của cửa sổ này nằm trong profile riêng `%LOCALAPPDATA%\CandyPot\browser-profile`.

## Chơi nhiều máy (Firebase)

Chưa cấu hình thì app vẫn chạy: bàn "Nhiều người join" giả lập trên chính máy đó (các tab thấy nhau). Để join qua mạng:

1. [Firebase console](https://console.firebase.google.com) → tạo dự án → **Build › Realtime Database** (chọn vùng Singapore `asia-southeast1`) và **Build › Authentication › Sign-in method › Anonymous** → bật.
2. **Project settings › Your apps › Web (`</>`)** → lấy config, chép `.env.example` thành `.env.local` rồi điền.
3. Deploy (lần đầu cần đăng nhập Google):

```bash
npx firebase-tools login
```

```bash
npm run build && npx firebase-tools deploy --only hosting,database --project <project-id>
```

Security rules ở `database.rules.json` (phòng `rooms/{mã 5 số}`, phải đăng nhập ẩn danh mới đọc/ghi).

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/core/` | Luật game, sổ cái, thuật toán trả kẹo, danh hiệu — thuần TypeScript, có test |
| `src/storage/` | Lưu trữ (`LocalRepo` = localStorage) |
| `src/sync/` | Phòng chơi nhiều máy: `FirebaseRoomBackend` (Realtime Database) / `LocalRoomBackend` (giả lập trên máy khi chưa có config) |
| `src/store/` | State app (Zustand) |
| `src/ui/` | Màn hình và form nhập ván |
