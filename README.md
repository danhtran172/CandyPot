# CandyPot 🍬

Sổ ghi kẹo cho nhóm bạn chơi bài ngoài đời: nhập kết quả mỗi ván, app tính lời/lỗ và cách trả kẹo ít lượt nhất.

- Game: **Tiến lên miền Nam**, **Xì dách** (có nhà cái), **Poker** (có pot, tính side pot)
- Bàn oval tối đa 10 người, bạn ngồi dưới cùng: mở ván đặt cược → **kéo hũ kẹo** thả vào người nhận (popup 3 số: cược × 1 / × 1,5 / × 2) → chốt ván
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

Tạo 2 shortcut trên Desktop: **CandyPot** (app) và **CandyPot Demo 6 nguoi** (bàn mẫu 6 người, bạn là 1 người, đang mở sẵn ván Xì dách — mở `/demo?reset=1` để dựng lại từ đầu).

Shortcut Bấm vào sẽ tự bật `npm run dev` (cửa sổ thu nhỏ, nếu chưa chạy) và mở app bằng Edge ở chế độ app, khung 400×880. Sửa code là app tự cập nhật (hot reload). Dữ liệu của cửa sổ này nằm trong profile riêng `%LOCALAPPDATA%\CandyPot\browser-profile`.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/core/` | Luật game, sổ cái, thuật toán trả kẹo, danh hiệu — thuần TypeScript, có test |
| `src/storage/` | Lưu trữ (`LocalRepo` = localStorage) |
| `src/store/` | State app (Zustand) |
| `src/ui/` | Màn hình và form nhập ván |
