# CandyPot — Thiết kế

- **Ngày:** 2026-09-29
- **Trạng thái:** Chờ duyệt
- **Repo:** https://github.com/danhtran172/CandyPot

## 0. Thay đổi sau khi dùng thử (2026-09-29)

Các mục dưới đây **thay thế** phần tương ứng trong §2, §3, §5, §6:

- **Không có số kẹo mặc định.** Bỏ gói kẹo, kẹo trên tay, renew. Mỗi người bắt đầu từ 0; lời/lỗ cộng dồn qua các ván.
- **Ván có 2 bước:** *Mở ván* (chọn người, đặt cược) → *Chốt ván*. Ván đang mở được lưu, không tính vào lời/lỗ cho đến khi chốt. Mỗi game tối đa 1 ván đang mở. Ván đã chốt có thể mở lại để sửa.
  - Tiến lên: **một mức cược chung** `u`.
  - Xì dách: chọn nhà cái, **mỗi con cược riêng** `b`.
  - Poker: mỗi người **bỏ vào pot** số kẹo riêng khi mở ván.
- **Mọi giao dịch là kéo thả:** kéo ô người trả thả vào người nhận (hoặc pot), hoặc bấm người trả rồi bấm người nhận. Popup hiện **4 mức gợi ý** + "Số khác".
  - Tiến lên: 4 hệ số nhỏ nhất trong luật × `u`, kèm tên tình huống (Bét→Nhất, Heo đỏ, Cháy…).
  - Xì dách: ×1–×4 cược của con; nút nhanh "Cái ăn / đền cả bàn ×1 / ×2".
  - Poker → pot: Theo · Tố gấp đôi · ½ pot · Cả pot. Pot → người: Cả pot · Phần được ăn (side pot) · ½ · ⅓. Chỉ chốt được khi pot = 0; khi chốt, các lượt qua pot được gộp thành ít lượt trả nhất.
  - Không có ván đang mở: kéo = chuyển tay (gợi ý ×1, ×2, ×5, ×10 cược gần nhất).
- Bỏ form nhập thứ hạng/thối/chặt/thắng-thua. Bỏ danh hiệu Nuôi heo, Đồ tể, Vua renew.
- **Cập nhật sau (bàn oval + hũ kẹo):** bàn oval tối đa 10 người, "Tôi" ngồi dưới cùng; mỗi người có **hũ kẹo** để kéo. Popup chỉ ghi **3 số = cược × 1 / × 1,5 / × 2** (làm tròn), không ghi tình huống hay hệ số. Cược gốc: Tiến lên = cược chung; Xì dách = cược của người con; Poker vào pot = số kẹo cần theo (chưa ai tố thì cược mở ván). Kéo pot cho người thắng: cả pot / phần được ăn / nửa pot. Bỏ hệ số luật và luật nhà (thay thế các gợi ý 4 mức ở trên).
- **Đòi kẹo:** kéo hũ kẹo của người khác thả vào chỗ "Tôi" → tạo lời đòi (chờ xác nhận). Người bị đòi thấy thông báo "X đòi bạn N" với Không / OK; OK thì ghi lượt kéo (vào ván đang mở, hoặc chuyển tay). Người đòi thấy danh sách "Đang đòi" và có thể hủy. Giai đoạn 1 giả lập "máy người khác" bằng cửa sổ thứ hai (vai riêng từng cửa sổ, đồng bộ qua sự kiện `storage`); giai đoạn 2 thay bằng Firebase.
- **Tiến lên 2 mức cược:** Nhất / Nhì (vd 4/2). Gợi ý: Nhì, Nhất, Nhất × 1,5, Nhất × 2.
- **Ô Bet (Xì dách):** giữa bàn có ô Bet chỉ để *đặt cược* (không giữ kẹo): người con kéo vào → popup cược × 1 / 1,5 / 2 hoặc số khác → ghi đè cược của ván đang mở; nhà cái không đặt được. Ô Bet không cộng tổng (Xì dách không tính pot). Cược hiện trước mỗi người dạng [1 icon kẹo ngẫu nhiên] × N. Ô Bet luôn hiện trong tab Xì dách (kể cả khi chưa mở ván — chip cược ván trước hiện mờ); kéo vào khi chưa có ván thì tự mở ván với người chơi/cái/cược của ván trước (ván đầu: mọi người đang chơi, người đầu làm cái, cược 5). Đổi cái: kéo mũ 🎩 giữa bàn thả vào người khác (cược của người mới làm cái chuyển cho cái cũ).
- **Luồng Xì dách:** đặt cược (kéo vào ô Bet) → **Chốt cược** (khóa cược; đang đặt cược thì không trả kẹo được) → chia bài ngoài đời → kéo trả kẹo → **Kết thúc** (tính ván vào lời/lỗ và mở ngay ván sau với cược cũ) → đặt cược… Chốt cược và Kết thúc là **một nút** (chưa có ván thì nút ghi "Ván mới") đổi chữ theo bước; không có nút Hủy ván cho Xì dách. Host nhấn giữ ô Bet (~0,6 giây) khi đã chốt để **bỏ chốt** (có hỏi lại); chỉ được khi ván chưa có lượt trả kẹo.
- **Lịch sử trả/nhận (của riêng mình):** nút "📜 Trả/nhận" ở góc dưới bên trái bàn (số = lượt của mình trong ván đang chơi + lời mình đòi đang chờ) mở popup chỉ gồm các lượt mình trả/nhận trong game đang chọn (mới nhất trước, + nhận / − trả) và lời đòi của mình.
- **Hoàn tác cần host:** mỗi buổi có một host (mặc định người đầu tiên, đổi ở màn Người chơi). Mọi lượt của mình (kể cả ván đã kết thúc) có nút ✕: host hoàn tác ngay (có hỏi lại); người khác gửi yêu cầu, host nhận thông báo "X muốn hoàn tác …" với Không / OK. Hoàn tác ở ván đã kết thúc thì tính lại giao dịch của ván; nếu làm lệch pot (Poker) thì báo lỗi.
- **Mở ván nhanh:** "+ Mở ván" mở luôn với cài đặt của ván trước (Xì dách mở luôn cả ván đầu); "⚙ Tùy chỉnh" để vào màn Mở ván.
- **Bỏ đống kẹo** (hiển thị lời/lỗ bằng icon), bỏ hàng nút "Cái ăn/đền cả bàn" và dòng hướng dẫn dưới bàn; bàn to hơn, nút Hủy/Chốt nhỏ lại.
- **Xác nhận bằng popup trong app:** mọi câu hỏi xác nhận (hủy ván, bỏ chốt, hoàn tác, xóa buổi/game/ván, bỏ người chơi) và báo lỗi đều là popup của CandyPot (`ask()`/`tell()` trong `src/ui/dialog.ts`, hiển thị bởi `DialogHost`), không dùng `confirm()`/`alert()` của trình duyệt. Hành động xóa có nút đỏ; Esc = Thôi, Enter = Đồng ý.
- **Tiến lên là bàn vuông:** 4 người ngồi giữa 4 cạnh ("tôi" ở cạnh dưới); chưa mở ván mà có hơn 4 người thì xếp đều quanh các cạnh. Poker và Xì dách giữ bàn oval.
- **Tab Host / Yêu cầu:** thanh dưới có thêm 2 tab cho mọi người, có số đếm việc cần trả lời. *Host*: host duyệt xin hoàn tác (từng cái / OK tất cả) + xem và hủy lời đòi giữa người khác; người thường thấy yêu cầu hoàn tác của mình "⏳ chờ host" và rút lại được. *Yêu cầu*: người khác đòi bạn (Không / OK / OK tất cả) và bạn đang đòi ai (hủy được). Thông báo trên cùng hiện việc cũ nhất, có "Để sau" (ẩn đến khi có việc mới) và "Xem cả N việc" (mở tab tương ứng).

## 1. Mục tiêu

CandyPot là **sổ ghi kẹo** cho một nhóm bạn chơi bài **ngoài đời thật** (bài thật, kẹo thật). App **không** chia bài, **không** xác định ai thắng — host nhập kết quả mỗi ván, app tự tính ai đưa ai bao nhiêu kẹo, lời/lỗ của từng người, và phương án trả kẹo **ít lượt chuyển nhất**.

### Trong phạm vi

- 3 game: **Tiến lên miền Nam**, **Xì dách**, **Poker (Texas Hold'em)**.
- Một **buổi** gồm nhiều **game**; một game gồm nhiều **ván**.
- 2 chế độ: **Chỉ host** (1 máy, offline) và **Host + người chơi** (người chơi vào phòng để **xem**).
- Lời/lỗ và phương án trả kẹo **luôn sẵn sàng sau mỗi ván** — không có khái niệm "kết thúc buổi".
- Renew kẹo, lịch sử theo ván / theo người, biểu đồ, danh hiệu, preset luật nhà, chia sẻ kết quả.
- Giao diện tiếng Việt, tối ưu cho điện thoại.

### Ngoài phạm vi

- Chơi bài ảo / chia bài / tự xác định thắng thua.
- Người chơi tự nhập cược hoặc gửi yêu cầu (người chơi chỉ xem).
- Chuyển quyền host sang máy khác.
- Tài khoản người dùng, đăng nhập bằng email/mạng xã hội.
- Nhiều loại "tiền tệ" — đơn vị duy nhất là **kẹo** (số nguyên).

## 2. Khái niệm cốt lõi

| Khái niệm | Ý nghĩa |
|---|---|
| **Buổi** (Session) | Một lần tụ tập chơi. Chứa danh sách người chơi, cài đặt, các game. |
| **Game** | Một loại game đang chơi trong buổi (VD: Tiến lên). Một buổi có thể có nhiều game, kể cả 2 game cùng loại. |
| **Ván** (Round) | Một ván bài. Sinh ra danh sách **giao dịch**. |
| **Giao dịch** (Transfer) | "A đưa B N kẹo". Là **đơn vị dữ liệu duy nhất** để tính mọi con số. |
| **Mức cược** (`bet`, ký hiệu `u`) | Đặt ở đầu mỗi ván, mặc định bằng mức ván trước. Mọi hệ số tính theo `u`. |
| **Gói kẹo** | Số kẹo mỗi người nhận đầu buổi và mỗi lần renew (mặc định 50). |

### Công thức

- **Lời/lỗ** của người P = Σ kẹo P nhận − Σ kẹo P trả (trên toàn bộ giao dịch). Tổng lời/lỗ cả bàn **luôn = 0**.
- **Kẹo trên tay** = gói kẹo × (1 + số lần renew) + lời/lỗ.
- **Renew** không làm thay đổi lời/lỗ, chỉ tăng kẹo trên tay. App gợi ý renew khi kẹo trên tay ≤ 0.
- **Trả kẹo cuối cùng** tính từ lời/lỗ (không tính kẹo trên tay).

## 3. Luật từng game

Các hệ số dưới đây là **mặc định**, chỉnh được trong **Cài đặt game** và lưu thành **preset luật nhà**.

### 3.1 Dùng chung

- Mỗi ván chọn **người tham gia** (không bắt buộc đủ mặt).
- **Chuyển tay**: ván đặc biệt chỉ gồm 1 giao dịch `A → B: N` với ghi chú tùy chọn. Có ở mọi game.
- Ván đã lưu có thể **sửa** (mở lại form với dữ liệu gốc) hoặc **xóa**.
- Khi lưu ván, `transfers` được tính và **lưu cố định**; đổi hệ số sau đó **không** tính lại các ván cũ. Chỉ khi sửa ván thì ván đó mới được tính lại theo cấu hình hiện tại.

### 3.2 Tiến lên miền Nam (2–4 người)

**Xếp hạng:** host bấm tên theo thứ tự về (Nhất → Bét).

| Số người | Trả theo hạng |
|---|---|
| 4 | Bét → Nhất `2u`; Ba → Nhì `1u` |
| 3 | Bét → Nhất `2u`; Nhì hòa |
| 2 | Bét → Nhất `1u` |

**Tình huống đặc biệt:**

| Tình huống | Quy tắc mặc định |
|---|---|
| **Tới trắng** | Người tới trắng nhận `3u` từ **mỗi** người còn lại. Ván không có xếp hạng, không có cháy/thối/chặt. |
| **Cháy / cóng** | Mỗi người cháy trả Nhất `3u`. Người cháy **bị loại khỏi bảng trả theo hạng**; những người không cháy trả theo bảng ứng với số người không cháy (nếu ≥ 2 người). Người cháy xếp cuối. |
| **Thối** | Chọn người bị thối (mặc định: Bét; không thể là Nhất) và số quân còn trên tay. Trả cho Nhất theo tổng hệ số. |
| **Chặt / chặt chồng** | Nhập chuỗi: `[người đánh + quân] → [người chặt + quân] → …`. Người **bị chặt cuối cùng** (áp chót trong chuỗi) trả người **chặt cuối cùng** tổng hệ số của **mọi quân trong chuỗi trừ quân chặt cuối**. Chặt đơn là chuỗi dài 2. |

**Bảng hệ số quân** (dùng cho thối và chặt):

| Quân | Hệ số |
|---|---|
| Heo đen (♠ ♣) | `1u` / lá |
| Heo đỏ (♦ ♥) | `2u` / lá |
| 3 đôi thông | `2u` |
| Tứ quý | `3u` |
| 4 đôi thông | `4u` |

*Ví dụ chặt chồng:* An đánh heo đỏ, Bình chặt bằng 3 đôi thông, Cường chặt Bình bằng tứ quý → Bình trả Cường `2u + 2u = 4u`. An không trả gì.

**Validate:** 2–4 người; xếp hạng đủ và không trùng (trừ khi tới trắng); người thối ≠ Nhất; chuỗi chặt ≥ 2 bước, hai bước liền nhau khác người.

### 3.3 Xì dách (có nhà cái)

- Chọn **nhà cái** mỗi ván (mặc định: cái ván trước). Người còn lại là **con**.
- Mỗi con đặt **cược riêng** `b` (mặc định: cược ván trước của người đó, hoặc `u`).
- Mỗi con có **kết quả** Thắng / Hòa / Thua và **nhãn bài** tùy chọn.
- Nhà cái có **nhãn bài** tùy chọn.

| Nhãn bài | Hệ số mặc định |
|---|---|
| Xì bàn | ×2 |
| Xì dách | ×2 |
| Ngũ linh | ×2 |
| Quắc (> 21), Non (< 16) | — (chỉ là nhãn, tính là Thua) |

**Tính tiền mỗi con:**
- Thắng → cái trả con `b × hệ số nhãn của con` (không nhãn = ×1).
- Thua → con trả cái `b × hệ số nhãn của cái` (không nhãn = ×1).
- Hòa → không giao dịch.

**Nút nhanh:**
- *Cái xì bàn / xì dách*: đặt nhãn cái tương ứng, mọi con = Thua. Host chỉnh lại từng con nếu cần.
- *Cái quắc*: nhãn cái = Quắc; con không quắc = Thắng; con quắc = **Hòa** (cấu hình được: Hòa / Thua).

**Validate:** có đúng 1 cái và ≥ 1 con; mọi con có kết quả; cược > 0.

### 3.4 Poker (Texas Hold'em, không nhà cái)

**Nhập:**
1. Tổng kẹo mỗi người tham gia đã bỏ vào pot cả ván (kể cả người fold).
2. Đánh dấu người **fold**.
3. Chọn **người thắng** (≥ 1; nhiều người = hòa, chia đều).
4. Chỉ khi có **side pot** (có người chưa fold bỏ vào ít hơn người chưa fold khác) app mới yêu cầu **thứ hạng bài** của tất cả người chưa fold (cho phép đồng hạng).

**Chia pot:**
1. Lấy các mức đóng góp khác nhau của **người chưa fold**, tăng dần → mỗi mức tạo một pot. Pot ở mức `L` gồm, từ mỗi người (kể cả người fold), phần đóng góp nằm trong khoảng (mức trước, `L`].
2. Người được ăn pot = người chưa fold có đóng góp ≥ `L`. Người có hạng tốt nhất trong số đó ăn pot; đồng hạng thì chia đều.
3. **Kẹo lẻ** khi chia: đưa cho người thắng đứng đầu theo thứ tự danh sách người chơi.
4. Phần đóng góp của người fold vượt quá mức cao nhất của người chưa fold được **trả lại** người đó.

**Giao dịch:** tính lời/lỗ ròng của ván (nhận − bỏ vào), rồi sinh giao dịch bằng thuật toán trả kẹo (§4) cho riêng ván đó.

**Validate:** ≥ 2 người; ít nhất 1 người chưa fold; người thắng phải chưa fold; đóng góp ≥ 0 và tổng > 0.

## 4. Thuật toán trả kẹo ít lượt nhất (`settle`)

Đầu vào: lời/lỗ ròng của từng người (tổng = 0). Đầu ra: danh sách `A → B: N`.

1. Bỏ người có lời/lỗ = 0. Gọi `n` là số người còn lại.
2. Nếu `n ≤ 15`: quy hoạch động trên tập con để chia những người này thành **nhiều nhóm có tổng = 0 nhất** (`k` nhóm). Số lượt tối thiểu = `n − k`. Trong mỗi nhóm, lặp: người lỗ nhiều nhất trả người lời nhiều nhất `min(|lỗ|, lời)` cho đến khi nhóm về 0.
3. Nếu `n > 15`: dùng thuật toán tham lam (lỗ nhiều nhất trả lời nhiều nhất) trên toàn bộ — đúng tiền, không đảm bảo tối thiểu.
4. Kết quả **xác định** (cùng đầu vào → cùng đầu ra): hòa thì ưu tiên theo thứ tự danh sách người chơi.

## 5. Danh hiệu

Tính từ lịch sử toàn buổi. Chỉ hiện danh hiệu có người đạt (giá trị ≠ 0). Đồng hạng → hiện tất cả.

| Danh hiệu | Điều kiện |
|---|---|
| 👑 Vua kẹo | Lời/lỗ cao nhất (> 0) |
| 🕳️ Thánh lỗ | Lời/lỗ thấp nhất (< 0) |
| 🔥 Nóng tay | Chuỗi dài nhất các ván liên tiếp **mà người đó tham gia** có kết quả ròng > 0 (≥ 3) |
| ♻️ Vua renew | Renew nhiều lần nhất |
| 🐷 Nuôi heo | Bị thối nhiều lần nhất (tag `thoi`) |
| 🔪 Đồ tể | Chặt nhiều lần nhất (tag `chat`) |
| 🎰 Cái số đỏ | Tổng ròng cao nhất (> 0) khi làm cái Xì dách |
| 💸 Cái số đen | Tổng ròng thấp nhất (< 0) khi làm cái Xì dách |
| 🪨 Bất động | \|Lời/lỗ\| nhỏ nhất, đã tham gia ≥ 5 ván |

## 6. Màn hình

```
Trang chủ ─┬─ Tạo buổi mới ──▶ Thêm người chơi ──▶ Chọn: Chỉ host / Mở phòng ──▶ Bàn chơi
           ├─ Tiếp tục buổi cũ ──▶ Bàn chơi
           └─ Vào phòng (mã / link QR) ──▶ Chọn tên mình ──▶ Bàn chơi (chỉ xem)
```

| Màn hình | Nội dung |
|---|---|
| **Trang chủ** | Tạo buổi, danh sách buổi cũ (tiếp tục / xóa), vào phòng. |
| **Tạo buổi** | Tên buổi, người chơi (tên + emoji), gói kẹo. Thêm / tắt người chơi được bất cứ lúc nào; người đã có giao dịch không xóa được, chỉ tắt. |
| **Bàn chơi** | Thanh chọn game (+ thêm game). Bảng người chơi: kẹo trên tay, lời/lỗ (xanh/đỏ), số lần renew, nút renew. Nút **+ Ván mới**, **Chuyển tay**. |
| **Nhập ván** | Form theo game (§3). Nút lưu bị khóa và hiện lý do khi validate lỗi. |
| **Tổng kết** | Lời/lỗ toàn buổi (lọc được theo game), danh sách trả kẹo, nút **Copy text** và **Lưu ảnh**. |
| **Lịch sử** | Tab *Theo ván* (bấm để xem chi tiết / sửa / xóa). Tab *Theo người*: kết quả từng ván + biểu đồ đường lời/lỗ cộng dồn. |
| **Danh hiệu** | §5. |
| **Phòng** | Host: mã 6 ký tự, QR, số người đang xem, nút đóng phòng. |
| **Cài đặt game** | Chỉnh hệ số; lưu / áp dụng preset luật nhà. |

**Chế độ người xem:** cùng các màn Bàn chơi / Tổng kết / Lịch sử / Danh hiệu nhưng **ẩn mọi nút sửa**. Dòng của người xem được tô sáng; đầu màn Tổng kết ghim "Bạn cần trả / nhận …". Mất kết nối → banner *"Mất kết nối — đang hiển thị dữ liệu cũ"*.

## 7. Kiến trúc

### 7.1 Công nghệ

| Hạng mục | Chọn |
|---|---|
| UI | React 19 + TypeScript + Vite |
| Style | Tailwind CSS |
| State | Zustand |
| Routing | React Router |
| PWA | vite-plugin-pwa |
| Realtime | Firebase Realtime Database + Anonymous Auth |
| Biểu đồ / QR / ảnh | Recharts · qrcode · html-to-image |
| Test | Vitest |
| Hosting | Firebase Hosting |

### 7.2 Cấu trúc dữ liệu

```ts
type ID = string;

interface Session {
  id: ID; name: string; createdAt: number; updatedAt: number;
  players: Player[];
  settings: { packSize: number };          // gói kẹo, mặc định 50
  renews: Renew[];
  games: Game[];
}
interface Player  { id: ID; name: string; emoji: string; active: boolean }
interface Renew   { id: ID; playerId: ID; at: number }
interface Game    { id: ID; type: GameType; name: string; config: GameConfig; rounds: Round[] }
type GameType = 'tienlen' | 'xidach' | 'poker';

interface Round {
  id: ID; at: number;
  kind: 'play' | 'manual';                 // manual = chuyển tay
  participants: ID[];
  bet: number;                             // u
  input: unknown;                          // dữ liệu gốc theo game, dùng để sửa ván
  transfers: Transfer[];                   // lưu cố định khi lưu ván
  tags: Tag[];                             // cho danh hiệu
}
interface Transfer { from: ID; to: ID; amount: number; reason: string }
interface Tag      { type: 'thoi' | 'chat' | 'lam-cai' | 'toi-trang' | 'chay'; playerId: ID }
```

`input` và `config` có kiểu cụ thể riêng cho từng game (định nghĩa trong `core/games/*`).

### 7.3 Tổ chức code

```
src/
├─ core/                    thuần TS, không import React/Firebase
│  ├─ types.ts
│  ├─ ledger.ts             net(), handOf(), assertZeroSum()
│  ├─ settle.ts             settle(net) → Transfer[]
│  ├─ titles.ts             titles(session) → Title[]
│  ├─ roomCode.ts           sinh mã phòng
│  └─ games/
│     ├─ index.ts           registry: type → { defaultConfig, validate, resolve }
│     ├─ tienlen.ts
│     ├─ xidach.ts
│     └─ poker.ts
├─ storage/
│  ├─ SessionRepo.ts        interface { list, load, save, remove, subscribe }
│  ├─ LocalRepo.ts          localStorage (giai đoạn 1)
│  └─ FirebaseRepo.ts       giai đoạn 2
├─ store/                   Zustand: addRound, editRound, deleteRound, renew, …
└─ ui/
   ├─ screens/
   ├─ games/                form nhập ván mỗi game
   └─ components/
```

**Hợp đồng mỗi game** (`core/games/*`):

```ts
interface GameModule<Cfg, In> {
  defaultConfig: Cfg;
  validate(input: In, cfg: Cfg): string[];            // [] = hợp lệ; chuỗi lỗi tiếng Việt
  resolve(input: In, cfg: Cfg, bet: number): { transfers: Transfer[]; tags: Tag[] };
}
```

### 7.4 Lưu trữ

- **LocalRepo:** `localStorage` key `candypot:sessions` (danh sách) và `candypot:session:<id>`; preset ở `candypot:presets`. Tự lưu sau mọi thay đổi.
- **FirebaseRepo (giai đoạn 2):**
  - Đường dẫn `rooms/{code}` = `{ hostUid, updatedAt, session }`.
  - Host luôn lưu local trước, sau đó ghi **nguyên session** lên Firebase (dữ liệu nhỏ, vài chục KB).
  - Người xem `onValue(rooms/{code})`; theo dõi `.info/connected` để hiện banner mất kết nối.
  - Mã phòng: 6 ký tự từ bảng `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`; tạo lại nếu trùng.
  - Link vào phòng: `/join?room=CODE` (QR chứa link này).

**Security rules:**

```json
{
  "rules": {
    "rooms": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() ? newData.child('hostUid').val() === auth.uid : data.child('hostUid').val() === auth.uid)"
      }
    }
  }
}
```

### 7.5 Xử lý lỗi

- Validate ở form (§3) — không cho lưu, hiện lý do.
- Sau mỗi lần thay đổi, `assertZeroSum()` kiểm tra tổng lời/lỗ = 0; nếu sai → hiện lỗi rõ ràng (đây là bug).
- `localStorage` lỗi / đầy → thông báo, không mất dữ liệu đang hiển thị.
- Firebase ghi lỗi → dữ liệu vẫn ở local, hiện cảnh báo, thử lại khi có mạng (SDK tự xếp hàng).

## 8. Kiểm thử

- **`core/` viết theo TDD với Vitest:**
  - Mỗi quy tắc ở §3 có ít nhất một test: xếp hạng 2/3/4 người, tới trắng, cháy (1 và 2 người), thối nhiều loại quân, chặt đơn, chặt chồng 3 bước; xì dách thắng/thua/hòa, nhãn ×2, cái xì bàn, cái quắc (cả 2 cấu hình); poker 1 người thắng, chia đều, kẹo lẻ, side pot 2 và 3 tầng, người fold bỏ nhiều.
  - `validate` cho mọi ca lỗi ở §3.
  - `settle`: đúng tiền, đúng số lượt tối thiểu với các ca biết trước, **1000 bộ ngẫu nhiên** kiểm tra tổng khớp và số lượt ≤ `n − 1`, kết quả xác định.
  - `ledger`, `titles`, `roomCode`.
- **UI:** chạy thử trên trình duyệt ở kích thước điện thoại (375×812) cho mọi luồng ở §6.

## 9. Giai đoạn

| Giai đoạn | Nội dung | Điều kiện |
|---|---|---|
| **1** | `core` + test → LocalRepo → toàn bộ UI chế độ chỉ host → PWA offline | — |
| **2** | FirebaseRepo, Phòng, QR, chế độ người xem, security rules, deploy Firebase Hosting | Chủ repo tạo dự án Firebase (bật Realtime Database, Anonymous Auth, Hosting) và cung cấp config web |
