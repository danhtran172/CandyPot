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
- **Nút Host / Yêu cầu:** góc dưới bên phải bàn chơi (đối diện 📜 Trả/nhận) có 2 nút 🛎️ Host và 📨 Yêu cầu cho mọi người, có số đếm việc cần trả lời; bấm mở màn tương ứng (có nút quay lại). Thanh dưới giữ 4 tab. *Host*: host duyệt xin hoàn tác (từng cái / OK tất cả) + xem và hủy lời đòi giữa người khác; người thường thấy yêu cầu hoàn tác của mình "⏳ chờ host" và rút lại được. *Yêu cầu*: người khác đòi bạn (Không / OK / OK tất cả) và bạn đang đòi ai (hủy được). Thông báo trên cùng hiện việc cũ nhất, có "Để sau" (ẩn đến khi có việc mới) và "Xem cả N việc" (mở tab tương ứng).
- **Tiến lên có ô Rule** (không gọi là Bet — Bet là của Xì dách)**:** giữa bàn vuông là ô Rule hiện mức Nhất/Nhì (kể cả khi chưa mở ván). Host bấm vào để đặt 2 mức (Nhì ≤ Nhất); đổi luôn ván đang mở và làm mặc định cho ván sau. Kéo trả kẹo gợi ý Nhì, Nhất, Nhất × 1,5, Nhất × 2 theo 2 mức này. Người khác bấm thì báo "Chỉ host mới đổi Rule được".
- **Chọn game = đổi cách tính:** ô chọn tự vẽ (có ảnh) ở đầu bàn gồm Tiến lên / Xì dách / Poker / Lô tô. Cùng một bàn, đổi game chỉ đổi cách tính (gợi ý, ô Rule/Bet/Pot, hình bàn) — lời/lỗ và lịch sử kẹo cộng dồn chung; không còn nhãn "đang chơi" hay nút "⚙ Game". Biểu tượng game là ảnh (`src/assets/games/*.webp`): 2♥ Tiến lên, A♦ Xì dách, chip ♠ Poker, Bingo Lô tô.
- **Lô tô:** giữa bàn có ô **Giá** (giá mỗi tờ, mặc định 5; host bấm để đổi — chỉ đổi được khi ván chưa ai mua) và ô **💰 Pot** ngay dưới. Người chơi kéo mình vào Pot → chọn 1 / 2 tờ hoặc gõ số tờ → app tự tính kẹo = số tờ × giá (kéo vào Pot khi chưa có ván thì tự mở ván). **Chốt** → không mua thêm; host kéo Pot vào người thắng → xác nhận "An thắng? Trao cả pot N kẹo" → ván tự kết thúc (tính lời/lỗ) → nút **Ván mới** (giữ giá cũ). Người khác kéo Pot thì báo "Chỉ host mới trao pot được". Có nút Hủy ván.
- **Tự do** (icon bảng màu `src/assets/games/free.webp`, luôn nằm cuối danh sách game): giữa bàn có 💰 Pot. Bấm/kéo vào Pot để cược (chưa có ván thì tự mở ván); số kẹo mỗi người đã cược trong ván luôn hiện trước chỗ ngồi (0 thì mờ). **Chốt cược** (khóa: không cược thêm; host "Bỏ chốt" được khi chưa trao pot) → kéo Pot vào người thắng (hoặc bấm Pot → "Ai thắng?") → gợi ý cả pot / phần được ăn / ½ pot; pot về 0 thì ván tự xong. Chưa chốt thì không trao pot được. Gửi kẹo cho nhau như mọi mode. Có nút Hủy ván khi đang có ván.
- **Tạo bàn / Join bàn:** "Buổi" đổi thành **bàn** trên giao diện. Trang chủ: **+ Tạo bàn** và **Join bàn**. Tạo bàn chọn 1 trong 2 kiểu (icon một màu: 1 host vàng / nhóm người xanh): **Một máy** (host ghi hết) hoặc **Nhiều người join** — lúc tạo chỉ nhập tên host (danh sách người chơi chỉ có ở kiểu Một máy; người khác tự join, trong lúc chờ host thêm ở màn Người chơi), bàn có **mã 5 số** (`Session.code`, hiện ở màn Người chơi và danh sách bàn). **Join bàn** = nhập mã 5 số; giai đoạn 1 chỉ mở được bàn có trên chính máy này, join qua mạng từ máy khác **chờ giai đoạn 2** (app báo "sắp có").
- **Quay lại ván trước (host):** nút ⏮ nằm bên trái nút chính (Mở ván / Chốt / Kết thúc / Tay mới…), chỉ host thấy và chỉ khi đã có ván chốt. Bấm → popup xác nhận → ván đang mở (nếu có) bị bỏ, ván vừa chốt gần nhất mở lại để sửa rồi chốt lại (`backRound`; lượt chuyển tay ngoài ván không bị ảnh hưởng). Popup chọn người / hướng dẫn: hàng thiếu (vd 2 lựa chọn Người chơi / Host) căn giữa.
- **Giai đoạn 2 — chơi nhiều máy:** bàn "Nhiều người join" = phòng `rooms/{mã 5 số}` trên Firebase Realtime Database = `{ sessionId, updatedAt, data }` (`data` là cả bàn dạng chuỗi JSON — tránh việc RTDB bỏ mảng rỗng). **Mọi máy đều ghi** (ai cũng tự trả / đòi / cược), không chỉ host: mỗi thay đổi (`mutate(fn)`) áp lên máy mình ngay rồi `runTransaction` chạy lại **đúng `fn` đó** trên bản mới nhất của phòng, nên hai máy bấm cùng lúc không mất lượt; id sinh trong `fn` được ghi lại và phát lại để máy mình và phòng cùng id. Máy nào mở bàn cũng `onValue` phòng → cập nhật tức thì. Mã trùng bàn khác → tự đổi mã. Join: nhập mã / link `/join?code=` (mã QR ở màn Người chơi, nút Gửi link) → tải bàn về máy → popup **"Bạn là ai?"** (chọn tên có sẵn hoặc thêm mình). Máy tạo bàn tự là host. Mất kết nối → banner vàng. Đăng nhập ẩn danh; rules: phải đăng nhập, mã 5 chữ số, `data` là chuỗi < 1 MB (`database.rules.json`). Chưa có config (`VITE_FIREBASE_*`) → `LocalRoomBackend` giả lập trong localStorage (mỗi tab join = một máy). Firebase SDK tách chunk riêng, chỉ tải khi có bàn nhiều người. Hosting: `firebase.json` (SPA rewrite).
- **Nhắc lại yêu cầu (🔔):** lời đòi kẹo còn chờ (màn Yêu cầu › Bạn đang đòi) và lời xin hoàn tác còn chờ host (màn Host › Bạn xin hoàn tác, 📜 Trả/nhận cạnh "⏳ chờ host") có nút **🔔 Nhắc**. Nhắc → `pingedAt`, `pings` (+1) trên yêu cầu; thông báo trên cùng bên kia **bật lại dù đã "Để sau"** và ghi "🔔 nhắc lần N", máy rung. Mỗi yêu cầu phải cách **30 giây** giữa hai lần nhắc (tính cả từ lúc tạo) — nút hiện đếm ngược. Yêu cầu đã trả lời / hủy thì không còn nút (gọi thẳng thì báo "không còn nữa").
- **Tiết kiệm dữ liệu + máy bỏ không:** phòng không còn là một chuỗi nguyên bàn mà **chia mẩu** `rooms/{mã}` = `{ meta: {sessionId, updatedAt}, p: { core, g_<game>, r_<game>_<ván> } }` (`src/sync/parts.ts`): `core` = bàn trừ game và `updatedAt`, `g_` = cài đặt game + thứ tự ván (`roundIds`), `r_` = một ván. Bấm một lần chỉ ghi các mẩu vừa đổi, mỗi mẩu một transaction chạy lại đúng thay đổi trên bản mới nhất (`PartsRoomBackend`); máy khác chỉ nhận mẩu đó. Đo: bàn 101 ván nặng 58 KB → mở ván gửi ~2,9 KB, một lượt trả kẹo ~1 KB. Thay đổi của mỗi máy gửi **lần lượt theo hàng đợi** sau khi phòng sẵn sàng; trong lúc còn thay đổi chưa gửi xong thì giữ bản từ phòng lại (không để bản cũ đè thao tác vừa bấm). Poker: chốt ván thì bỏ các bản chụp hoàn tác. **Kết nối theo nhu cầu** (`FirebaseRoomDb`): chỉ nối mạng khi đang mở bàn nhiều người; app ẩn quá 1 phút hoặc 15 phút không chạm → tạm ngắt (banner 💤, chạm là nối lại) — gói Spark giới hạn 100 máy kết nối cùng lúc. **Dọn phòng bỏ không:** `activity/{mã}` = lần dùng cuối (mở bàn cũng tính, ghi tối đa 10 phút/lần); máy nào mở bàn nhiều người thì mỗi ngày dọn giúp tối đa 20 phòng quá 30 ngày (rules chỉ cho xóa phòng đã quá hạn). Phòng bị dọn mà máy chủ bàn mở lại thì tự đưa lên lại. Phòng kiểu cũ tự chuyển sang kiểu mới; phòng tạo dở (có meta, thiếu mẩu) tự ghi bù.
- **Khóa đổi góc nhìn:** "bạn là ai" chỉ chọn lúc tạo bàn (máy tạo = host) hoặc lúc join (popup "Bạn là ai?"); màn Người chơi **không còn chạm avatar để thành người khác** (tránh một máy giả làm người khác để trả / đòi kẹo). Chạm avatar = đổi biểu tượng. Dấu "bạn" trên avatar là icon hình người (`MeIcon`) thay cho 🙋.
- **Người join không phải host:** bàn nhiều người, máy chưa chọn "bạn là ai" thì **chưa là ai** (trước đây mặc định là người đầu danh sách = host → hướng dẫn host tự bật, chuyển host không cần bầu). Bàn một máy mặc định là host. Bàn nhiều người, **chỉ host** điều khiển ván (mở / chốt / hủy / kết thúc / tay mới), đổi game, đổi nhà cái, trao pot; người khác thấy "🛎️ <host> điều khiển ván" ở thanh dưới, chỉ **trả kẹo của mình / đòi về mình**, cược / mua tờ của mình, và bấm Poker khi tới lượt mình. **Tạo bàn mặc định "Nhiều người join"** (đứng trước "Một máy").
- **Ẩn thứ không có quyền** (bàn nhiều người, không phải host — `canHostOf`): ô chọn game chỉ hiện game đang chơi (không mũi tên, không mở), chưa có game thì "Chờ <host> chọn game…"; không có ⚙ cài đặt; 🎩 nhà cái chỉ để xem; Lịch sử không có Mở lại / Xóa ván; màn Người chơi chỉ sửa được tên / biểu tượng / 💤 của chính mình, không có "Thêm người", không vuốt xóa. **Vùng an toàn iPhone** (tai thỏ / Dynamic Island, app ở chế độ toàn màn hình): nội dung, thanh trên cùng (sticky dưới vùng an toàn), thông báo và toast đều thụt xuống `env(safe-area-inset-top)`; dải trên cùng che bằng màu nền.
- **Nhớ tên theo trình duyệt:** `candypot:profile` = `{ name, emoji }` lưu khi tạo bàn (người đầu / host), khi chọn "Bạn là ai?" và khi tự sửa tên / biểu tượng của mình. Lần sau Tạo bàn và "Bạn là ai?" tự điền sẵn; trong phòng có sẵn đúng tên đó thì ô tên ấy được làm nổi (viền vàng, "bạn?").
- **Quét mã QR để join:** màn Join bàn có "📷 Quét mã QR" (dưới ô nhập mã): mở camera sau ngay trong app, đọc bằng `BarcodeDetector` nếu trình duyệt có (Chrome Android), không thì `jsQR` (tải lúc cần, chunk riêng ~47 KB gzip). Đọc được link `…/join?code=12345` hoặc mã 5 số trần (`codeFromQr`) → vào bàn luôn; QR khác thì báo không phải mã bàn. Không có quyền camera → báo, nhập mã tay.
- **Hướng dẫn v2 — ngắn, có bàn tay mẫu:** viết lại gọn, đi thẳng vào thao tác. Người chơi (mọi game): Đây là bạn → **Bấm người = trả kẹo** (tay mẫu bấm vào ghế đối diện) → **Hoặc kéo kẹo sang** (tay mẫu kéo gói kẹo từ mình sang người đó) → **Kéo về mình = đòi** (kéo ngược lại) → 1 bước riêng của game (Bet / Pot / lượt Poker) → Trả/nhận → Ai đòi bạn. Host: Bạn là host → luồng ván của game (+ Xì dách: kéo 🎩 sang người mới; Lô tô / Tự do: kéo Pot vào người thắng) → Luật → Người chơi → Duyệt hoàn tác. Bàn tay mẫu (`demo: tap | drag`) chạy lặp bằng Web Animations ngay trên bàn thật, vùng sáng bao cả điểm đầu và điểm cuối; ghế đối diện đánh dấu `data-guide="other"`. Đổi bản (`v2`) nên mọi người được xem lại một lần.
- **Popup nổi trên bàn phím:** `src/ui/keyboard.ts` theo dõi `visualViewport` → biến CSS `--kb` = phần màn hình bị bàn phím che (bỏ qua khi đang phóng to, ngưỡng 60px); mọi popup toàn màn hình (`[role=dialog|alertdialog].fixed.inset-0`) lấy nó làm `bottom` → nổi ngay trên bàn phím (iPhone). Viewport thêm `interactive-widget=resizes-content` để Chrome Android co trang lại khi có bàn phím.
- **Chấm xanh = đang online:** bàn nhiều người, máy đã chọn mình là ai thì ghi `online/{mã}/{mã kết nối}` = id người chơi, kèm `onDisconnect().remove()` → tắt app / đóng tab / mất mạng / tạm ngắt (ẩn 1 phút, 15 phút không chạm) là máy chủ tự xóa; nối lại thì ghi lại. Mỗi tab một mã kết nối (một người mở trên 2 máy vẫn đúng). Mọi máy theo dõi `online/{mã}` → chấm xanh góc trên trái avatar (trên bàn và tab Người chơi). Máy mình đang mất kết nối / tạm ngắt thì không hiện chấm nào (không biết chắc). Dọn phòng bỏ không thì xóa luôn `online/{mã}`. Mỗi lần vào / ra chỉ vài chục byte.
- **Host offline → nhận host:** khi chắc chắn host offline (máy mình đang kết nối, đã thấy chính mình online, host không có chấm xanh — `useHostAway`), người chơi thấy ⚪ "X đang offline": thanh dưới bàn có nút **🛎️ Làm host**, tab Người chơi thì 🛎️ ở dòng của mình được đánh dấu. Bấm → hỏi lại → `takeHost(me, hostCũ)`: chỉ đổi khi host trên phòng vẫn là host cũ, nên hai người cùng bấm thì ai ghi trước được, người sau không đè. Bầu 2 phiếu vẫn dùng như cũ.
- **Luôn chạy bản mới nhất** (`src/freshVersion.ts`): đăng bản mới thì file JS cũ (tên có mã băm) bị thay, máy chủ trả `index.html` cho file cũ → máy đang mở bản cũ mà giờ mới tải phần Firebase sẽ lỗi (không join / không kết nối được). Nay: bắt `vite:preloadError` → tải lại trang (tối đa 1 lần / 30 giây); `registerSW({ immediate })` → bản mới cài xong tự tải lại trang; mở app từ nền → kiểm tra bản mới. Kết nối Firebase lỗi (tải SDK / đăng nhập) thì lần sau thử lại, không kẹt lỗi.
- **Bàn nhiều người không thêm người tay:** mỗi người tự join bằng mã / QR và tự thêm tên mình (WhoAmI); tab Người chơi không còn ô "Thêm người". Người bị xóa join lại đúng tên là trở lại.
- **Bàn một máy = host ghi hộ cả bàn:** không có đòi kẹo — kéo người khác về chỗ mình là ghi họ trả mình luôn; kéo giữa hai người bất kỳ, kéo người vào Bet / Pot để cược / mua tờ hộ. Nút ⇄ trong popup: "X trả Y thay vì ngược lại". Không có góc Host / Yêu cầu; 📜 Trả/nhận hiện mọi lượt của cả bàn (A → B). Hướng dẫn riêng (Bạn ghi hộ cả bàn → Kéo = ai trả ai → bước hộ của game → luồng ván → Trả/nhận cả bàn → Luật → Người chơi), nút ? mở thẳng không cần chọn vai.
- **Hướng dẫn chỉ một lần cho mỗi tính năng:** mỗi bước có `id`; tự hiện những bước chưa xem bao giờ trên máy này và đang có trên màn hình (vd 🎩 chỉ khi đã có ván) — bước chung giữa các game (bấm / kéo để trả…) chỉ hiện một lần cho cả app. Lưu `candypot:guide-steps-seen`; ai đã xem bộ cũ (`candypot:guides-seen`) thì coi như đã xem các bước đó. Không bật khi đang mở popup, đóng xong mới hiện. Nút ? vẫn xem lại toàn bộ.
- **Lời đòi bị từ chối → nhờ host:** từ chối không xóa lời đòi mà đánh dấu `status: 'declined'`; người đòi vẫn thấy ở 📨 Yêu cầu ("✋ X từ chối", badge góc Yêu cầu tính cả lời đòi đã được trả lời) cho đến khi tự xóa (✕). Thay nút 🔔 bằng **🛎️ Nhờ host giải quyết** → `escalated`: host nhận việc ⚖️ "A nhờ host: đòi B N" (popup + tab Host, cùng chỗ với xin hoàn tác) → **Duyệt** = chuyển kẹo luôn (lượt ghi "Host duyệt đòi kẹo") và xóa lời đòi; **Không** = `rejected` ("❌ host từ chối", người đòi xóa). Đang chờ host thì 🔔 nhắc host được. Host tự đòi mà bị từ chối thì nút là "Host ghi luôn".
- **Lô tô — số tờ trên bàn + chỉnh lại:** trước chỗ ngồi mỗi người hiện chip [tờ bingo] × N (icon `src/assets/loto-ticket.webp` dùng làm mask, tô màu riêng từng người — `ticketColors`: bảng 10 màu xáo theo id bàn, chia theo thứ tự người → không trùng, giữ nguyên suốt buổi). Chưa chốt mà người đã mua kéo (hoặc bấm) Pot lần nữa → popup "X đổi số tờ?" với 0 (bỏ mua) … tối đa, ô đang mua được đánh dấu → `setLotoTickets` gộp các lần mua thành một lượt đúng số tờ mới (trả lại / lấy thêm kẹo). Chốt rồi thì không đổi được.
- **Quy ước lựa chọn nên dùng:** trong mọi nhóm lựa chọn, lựa chọn đầu tiên bên trái là lựa chọn hợp lý nhất và mang huy hiệu 👍 (`RecommendBadge`, icon `src/assets/recommend.webp` làm mask, màu `--color-recommend` #84C5B1) ở góc trên bên phải. Áp dụng: popup số kẹo (`AmountSheet`), Tố (Poker), kiểu bàn khi Tạo bàn (Nhiều người join). Xì dách đặt cược: cược cũ đứng đầu (không có thì mức giữa), còn lại tăng dần. Lô tô đổi số tờ: đầu tiên là mua thêm 1 tờ (đủ tối đa thì bớt 1), "0 = bỏ mua" cuối.
- **Tổng kết — lọc trả kẹo:** thẻ Trả kẹo có bộ lọc **Tôi cần trả ai · N** / **Ai cần trả tôi · N** / **Tất cả** (theo "tôi" của máy này). Mặc định tự chọn theo mình: đang nợ → Tôi cần trả; được nợ → Ai cần trả tôi; hòa → Tất cả. Tất cả thì tô sáng các lượt có mình. Copy text vẫn là cả bàn.
- **Hướng dẫn trên giao diện** (`src/ui/guides.ts` + `GuideTour`): nút **?** cạnh "👥 Người chơi" → chọn **Người chơi** hoặc **Host** → tour từng bước: màn hình tối đi, phần tử đang nói tới được khoét sáng + viền vàng nhấp nháy, thẻ giải thích Trước / Tiếp / Bỏ qua (phím ← → Esc). Nội dung theo từng mode và vai trò; bước nào không có phần tử trên màn hình (vd chưa có ván) thì tự bỏ qua. **Lần đầu** chơi một mode (vai người chơi) hoặc lần đầu làm host của một mode trên máy này → tự mở hướng dẫn; đã xem thì lưu ở `localStorage` (`candypot:guides-seen`, theo `mode:vai`).
- **Rule ? + ⚙ cho mọi mode có luật** (Tiến lên, Xì dách, Poker, Lô tô; Tự do không có): giữa bàn có nút hồng **Rule ?** — ai bấm cũng mở popup xem luật hiện hành (icon + giá trị), host có thêm nút "⚙ Chỉnh". Nút **⚙** góc trên phải bàn: chỉ host, mở popup cài đặt của mode (icon ở `src/assets/rules/`, min/max là SVG tự vẽ):
  - **Tiến lên:** 🥇 Nhất, 🥈 Nhì (tiền ăn, nhập 1 ô ô kia tự tính), heo đỏ (mặc định = Nhất), heo đen (mặc định = Nhì) — đặt riêng được, "🔗" để theo lại. Gợi ý khi trả kẹo: Nhì, Nhất, Heo đen, Heo đỏ (có icon dưới số); heo trùng giá thì bù Nhất × 1,5 / × 2.
  - **Lô tô:** giá mỗi tờ + tối đa N tờ mỗi người một ván (mặc định 2). Mua quá thì báo "đã mua đủ N tờ"; gợi ý chỉ hiện số tờ còn mua được.
  - **Xì dách:** cược tối thiểu (mặc định 1) và tối đa (mặc định 5 × min, tự tính theo min, sửa riêng được). Đặt cược ngoài khoảng bị chặn; gợi ý cược = min / giữa (hoặc cược cũ) / max.
  - **Poker:** small blind, all-in (big blind = 2 × SB).
- **Giao diện Pot / Giá:** ô Pot (mọi game có pot: Poker, Lô tô) có biểu tượng nồi kẹo (`src/assets/pot.webp`) ở góc trên bên trái kèm chữ "Pot", số kẹo ở giữa. Ô Giá của Lô tô gọn một dòng: "Giá [N] / tờ".
- **Hình khi kéo kẹo:** lúc kéo trả/đòi/đặt kẹo, thứ bay theo tay là ảnh gói kẹo (`src/assets/drag-candy.webp`) thay cho hũ kẹo SVG cũ (đã bỏ `CandyJar`), mờ 80%; kéo từ Pot thì là nồi kẹo (`pot.webp`); kéo mũ nhà cái vẫn là 🎩.
- **Bấm thay cho kéo** (kéo vẫn dùng được; người làm luôn là "mình"): bấm người khác → popup đưa kẹo cho họ, có nút ⇄ đổi sang đòi kẹo; bấm chính mình → 📜 Trả/nhận; bấm ô Bet (Xì dách) → mình đặt cược; bấm 🎩 → chọn nhà cái trong danh sách; bấm Pot → Poker: bỏ kẹo vào pot (popup có thêm "🏆 Trao pot… cho người thắng" → chọn người → chọn số), Lô tô: mua tờ; sau khi Chốt, host bấm Pot → "Ai thắng?" → xác nhận trao pot. Các dòng hướng dẫn trên màn hình đổi từ "kéo" sang "bấm".
- **Poker có luật đầy đủ** (`src/core/games/pokerHand.ts`, trạng thái ở `Round.poker`): mỗi **tay** có nút D xoay vòng, tự bỏ SB/BB (BB = 2 × SB); các vòng **Preflop → Flop → Turn → River → Showdown**, đi theo lượt (người tới lượt viền xanh), tố thì mở lại lượt, theo đủ thì tự sang vòng sau. Nút **↩** (hoàn tác thao tác cuối) nằm bên phải, phía dưới avatar của mình. Thanh nút: **Bỏ bài** · **Xem bài / Theo N** · **Tố** (gợi ý tổng vòng: tối thiểu, ×1,5, ×2 hoặc tự nhập, ghi "bỏ thêm X") · **All-in** (mặc định bỏ nốt tới mức all-in; thiếu thì sửa số nhỏ hơn). Chip vòng hiện trước chỗ ngồi; nhãn D / SB / BB / Bỏ bài / All-in dưới tên. Người all-in thiếu → app tự chia **pot chính / pot phụ** (ghi ai được ăn pot nào). Showdown: host chỉ cần **bấm người bài mạnh nhất** → app tự trao mọi pot người đó được ăn; nếu họ all-in thiếu (không được ăn pot phụ), app hỏi tiếp "trong những người còn lại, ai mạnh nhất?" (chỉ hiện người có quyền ăn pot còn lại). Hòa → "🤝 Hòa? Chọn nhiều người" → app chia đều từng pot giữa những người hòa được ăn pot đó (dư lẻ cho người ngồi gần sau nút D). Mỗi lần chọn là một thao tác, ↩ hoàn tác được. Bỏ bài hết chỉ còn 1 người → người đó tự ăn pot. Xong tay → **Tay mới**. Nút **⚙** góc trên phải bàn (host): small blind (mặc định 1) và mức all-in (mặc định 10 × SB, tự tính theo SB, sửa riêng được) — áp dụng từ tay sau. Trong tay bài không kéo/bấm vào pot được (dùng nút), không hoàn tác lẻ từng lượt (dùng ↩).
- **Biểu tượng hoàn tác** (`src/assets/undo.webp`, mũi tên vòng màu kem): chỉ dùng cho hoàn tác trả/đòi kẹo — nút hoàn tác lượt trả/nhận và rút lời đòi trong 📜 Trả/nhận và màn Yêu cầu (thay cho ✕). Nút ↩ của Poker và popup/thẻ "muốn hoàn tác" giữ ↩ như cũ.
- **Cược Tiến lên tự tính:** ở ô Rule và màn Mở ván, nhập một ô thì ô kia tự tính (Nhất = 2 × Nhì, Nhì = Nhất ÷ 2 làm tròn); sửa tiếp ô vừa được tự tính là đặt riêng, bấm "Tự tính lại" để nối lại.
- **Nút +/− nhảy theo hệ số:** mọi ô số (cược, "Số khác" khi trả/đòi/đặt kẹo…) có + nhảy ×1,5 → ×2 → ×3 của số gốc rồi lặp lại từ ×3 (4 → 6 → 8 → 12 → 18 → 24 → 36), − đi lùi đúng các bậc đó. Số gốc là số đang có hoặc số vừa gõ; muốn số khác thì gõ thẳng vào ô (số có gạch chân chấm).
- **Màn Người chơi gọn lại:** bỏ nút "Tôi" — chạm avatar để chọn mình (avatar viền vàng + 🙋), giữ avatar để đổi biểu tượng; Host là icon 🛎️, Tạm nghỉ là icon 💤 (bật thì sáng màu, tắt thì mờ). Tên hiện đủ, không bị cắt.
- **Người tạm nghỉ trên bàn:** vẫn ngồi trên bàn chơi (không vào ván mới), avatar và tên mờ đi, có 💤 ở góc avatar; avatar ở màn Người chơi cũng mờ + 💤.
- **Nhà cái Xì dách = nơ:** avatar của nhà cái có icon nơ xanh dương đậm (viền sáng) (`src/assets/rules/bowtie.webp`) ở góc dưới bên phải, thay cho dòng chữ "🎩 Nhà cái" dưới tên (ô 🎩 giữa bàn vẫn để bấm đổi cái).
- **Tiến lên — ai chơi:** không tick trên bàn nữa. Người chơi = mọi người không tạm nghỉ; ai không chơi thì cho nghỉ 💤 ở tab **Người chơi** (`seatedOf`). Người chơi ngồi ở **giữa 4 cạnh bàn vuông** (mỗi người một cạnh: tôi cạnh dưới; 3 người = dưới, trái, phải; 2 người = dưới, trên). Game đang chơi lưu trong `Session.currentGameId` — rời màn Bàn chơi (vd sang tab Người chơi) rồi quay lại vẫn giữ game. `normalizeSession` giữ lại `mode`, `code`, `currentGameId` khi đọc bàn từ máy. Quá 4 người: dòng trạng thái báo "Quá 4 người — cho người không chơi nghỉ 💤" (bấm → tab Người chơi) và chưa mở ván được.
- **Vuốt trái để xóa người khỏi phòng:** vuốt một dòng ở màn Người chơi sang trái để lộ nút 🗑️ Xóa ở mép phải (chạm dòng đang mở để đóng). Chưa chơi ván nào → xóa hẳn. Đã chơi → ẩn khỏi danh sách và bàn (`removed`), lời/lỗ, lịch sử, Tổng kết vẫn giữ để tính trả kẹo; thêm lại đúng tên đó thì người đó quay về với số cũ. Không xóa được host (chuyển host trước) và người đang trong ván chưa kết thúc. Xóa người thì bỏ luôn lời đòi, yêu cầu hoàn tác và phiếu bầu liên quan.
- **Bầu host (khi host vắng):** ở màn Người chơi, host toàn quyền: bấm 🛎️ ở người khác là chuyển host ngay (chỉ hỏi lại, không cần vote); người khác bấm 🛎️ là bỏ 1 phiếu bầu người đó (mỗi người 1 phiếu, bấm lại để rút, bấm người khác để đổi). Luôn cần đúng 2 phiếu, không phụ thuộc số người — app hiện "Đủ 2 phiếu là thành host" và số phiếu từng người (vd Bình 1/2). Đủ phiếu thì người đó thành host ngay, mọi phiếu bị xóa; host đổi host trực tiếp cũng xóa phiếu. Người đang nghỉ không bầu được. Màn Host có lối tắt "Host vắng? Bầu host mới".

## 1. Mục tiêu

CandyPot là **sổ ghi kẹo** cho một nhóm bạn chơi bài **ngoài đời thật** (bài thật, kẹo thật). App **không** chia bài, **không** xác định ai thắng — host nhập kết quả mỗi ván, app tự tính ai đưa ai bao nhiêu kẹo, lời/lỗ của từng người, và phương án trả kẹo **ít lượt chuyển nhất**.

### Trong phạm vi

- 3 game: **Tiến lên miền Nam**, **Xì dách**, **Poker (Texas Hold'em)** (+ **Lô tô**, tạm để trống).
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
