# CandyPot 🍬

Sổ ghi kẹo cho nhóm bạn chơi bài ngoài đời: nhập kết quả mỗi ván, app tính lời/lỗ và cách trả kẹo ít lượt nhất.

- Game: **Tiến lên miền Nam**, **Xì dách** (có nhà cái), **Poker** (tự chia side pot)
- Chuyển tay, renew, lịch sử theo ván / theo người, danh hiệu, luật nhà
- Web app (PWA) — thêm vào màn hình chính, chạy offline, dữ liệu lưu trên máy

Thiết kế: [docs/superpowers/specs/2026-09-29-candypot-design.md](docs/superpowers/specs/2026-09-29-candypot-design.md)

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # test phần tính kẹo (src/core)
npm run build    # bản production + service worker trong dist/
```

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/core/` | Luật game, sổ cái, thuật toán trả kẹo, danh hiệu — thuần TypeScript, có test |
| `src/storage/` | Lưu trữ (`LocalRepo` = localStorage) |
| `src/store/` | State app (Zustand) |
| `src/ui/` | Màn hình và form nhập ván |
