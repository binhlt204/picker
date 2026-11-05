# 🚀 HƯỚNG DẪN CHẠY PICKBALL — TỪNG BƯỚC

> Mục tiêu: sau khi đọc xong, bạn chạy được hệ thống và tổ chức được một buổi kiểm tra trên lớp.

---

## 🧩 Hệ thống gồm 4 phần

| Phần | Chạy ở đâu | Địa chỉ | Dùng để |
|---|---|---|---|
| **Server** (Node.js) | Laptop | `http://localhost:3001` | Lưu dữ liệu, kết nối các thiết bị |
| **Web** (Next.js) | Laptop | `http://localhost:3000` | Giáo viên quản lý lớp/đề, chiếu lên máy chiếu |
| **Detector** (Python) | Laptop | `127.0.0.1:5001` | Đọc mã thẻ ArUco trong ảnh chụp |
| **App điện thoại** (Flutter) | Điện thoại GV | — | Chụp ảnh lớp, điều khiển câu hỏi từ xa |

> ⚠️ Laptop và điện thoại **phải dùng chung một mạng WiFi**.

---

## PHẦN A — CÀI ĐẶT (chỉ làm 1 lần)

### Bước 1. Cài phần mềm cần có trên laptop
- **Node.js** bản 20 trở lên — https://nodejs.org
- **Python** 3.10 trở lên — https://python.org (khi cài nhớ tick *"Add Python to PATH"*)
- **Flutter** (chỉ cần nếu muốn tự build app điện thoại) — https://flutter.dev

### Bước 2. Cài thư viện
Mở terminal tại thư mục `D:\pickball` rồi chạy:

```bash
npm install
pip install opencv-contrib-python numpy
```

### Bước 3. (Tuỳ chọn) Tạo dữ liệu mẫu để thử
```bash
npm run seed
```
→ Tạo sẵn 1 lớp, 15 học sinh, 5 câu hỏi.

---

## PHẦN B — KHỞI ĐỘNG MỖI LẦN DÙNG

Cần mở **2 cửa sổ terminal** tại `D:\pickball`:

**Terminal 1 — Server + Web:**
```bash
npm run dev
```
Chờ thấy dòng `🚀 Server running at http://localhost:3001` và Web báo `Ready`.

**Terminal 2 — Bộ đọc thẻ (Detector):**
```bash
python scripts/detector_service.py
```
Chờ thấy dòng `ArUco Detector Microservice listening on http://127.0.0.1:5001`.

> ❗ **Đừng quên Terminal 2.** Nếu không chạy, camera điện thoại sẽ không nhận được thẻ nào.

### Kiểm tra nhanh
- Mở `http://localhost:3000`: thấy trang Web là OK.
- Mở `http://localhost:3001/api/health`: thấy `{"status":"ok"...}` là Server OK. (Mở `http://localhost:3001` sẽ tự chuyển sang trang quản trị `http://localhost:3000/admin`.)

### Tìm địa chỉ IP của laptop (để điện thoại kết nối)
Trong terminal gõ `ipconfig`, tìm dòng **IPv4 Address** của mạng WiFi, ví dụ `192.168.1.11`.
→ Địa chỉ server cho điện thoại là: `http://192.168.1.11:3001`

> Nếu điện thoại không kết nối được: kiểm tra Windows Firewall đã cho phép Node.js truy cập mạng **Private**.

---

## PHẦN C — CÀI APP LÊN ĐIỆN THOẠI

**Cách 1 — Android, nhanh nhất:** trên điện thoại mở trình duyệt, vào
`http://<IP-laptop>:3001/download-app` → tải file APK → cài đặt.

**Cách 2 — Tự build (Android/iOS):** cắm điện thoại vào laptop rồi chạy:
```bash
cd apps/mobile
flutter run
```

---

## PHẦN C2 — CÀI APP LÊN IPHONE (miễn phí, bằng Sideloadly)

> **Cần biết trước:**
> - File IPA do GitHub tạo ra là bản **chưa ký**, iPhone không cài trực tiếp được. Phải dùng **Sideloadly** trên máy tính Windows để ký bằng Apple ID của bạn rồi cài.
> - Với Apple ID miễn phí, app **chỉ chạy được 7 ngày**. Hết hạn thì cắm lại iPhone và làm lại **Bước 3**, dữ liệu không mất.
> - Chỉ **điện thoại của giáo viên** cần cài app. Học sinh chỉ giơ thẻ giấy.

### Bước 1. Tải file IPA từ GitHub
1. Đăng nhập GitHub rồi mở repo `https://github.com/binhlt204/picker` → tab **Actions** → chọn lần chạy **Build iOS IPA** mới nhất có **dấu tick xanh ✅**.
   (Bản đã build thành công: https://github.com/binhlt204/picker/actions/runs/41950392173)
2. Kéo xuống cuối trang, mục **Artifacts**, bấm **`pickball-scanner-ios-ipa`** để tải file `.zip`.
3. **Giải nén** file zip, được file **`pickball-scanner.ipa`**.

> Artifact chỉ giữ **7 ngày**. Hết hạn thì vào tab **Actions → Build iOS IPA → Run workflow** (chọn nhánh `binh`), chờ khoảng 5–10 phút rồi tải lại.

### Bước 2. Chuẩn bị máy tính (chỉ làm 1 lần)
1. Cài **iTunes** và **iCloud** bản tải từ **apple.com**, không dùng bản Microsoft Store.
2. Tải và cài **Sideloadly** từ `sideloadly.io`.
3. Cắm iPhone vào máy tính bằng **cáp có truyền dữ liệu**, **mở khoá màn hình** iPhone.
4. Khi iPhone hỏi **"Tin cậy máy tính này?"**, bấm **Tin cậy** và nhập mật khẩu màn hình khoá.

### Bước 3. Ký và cài bằng Sideloadly
1. Mở **Sideloadly**, ô thiết bị phải hiện tên iPhone của bạn.
2. Kéo file **`pickball-scanner.ipa`** vào ô IPA.
3. Nhập **Apple ID** (nên dùng Apple ID phụ nếu có), bấm **Start**, nhập mật khẩu và mã xác minh hai bước nếu được hỏi.
4. Chờ thanh tiến trình chạy xong. Trên iPhone sẽ xuất hiện biểu tượng **Pickball Scanner**.

**Nếu báo lỗi `LOCKDOWN_E_USER_DENIED_PAIRING`** (iPhone chưa tin cậy máy tính):
1. Bấm **Cancel**, rút cáp, mở khoá iPhone rồi cắm lại.
2. Khi hộp thoại **"Tin cậy máy tính này?"** hiện lên, bấm **Tin cậy** rồi nhập mật khẩu.
3. Quay lại Sideloadly, bấm **Retry** hoặc **Start** lại.
4. Nếu iPhone không còn hỏi "Tin cậy": vào **Cài đặt → Cài đặt chung → Chuyển hoặc đặt lại iPhone → Đặt lại → Đặt lại Vị trí & Quyền riêng tư**, rồi rút và cắm cáp lại. Việc này không xoá dữ liệu hay ảnh.

### Bước 4. Cho phép app chạy trên iPhone
1. Vào **Cài đặt → Cài đặt chung → VPN & Quản lý thiết bị**, chọn Apple ID của bạn, bấm **Tin cậy**.
2. Nếu iPhone dùng iOS 16 trở lên: vào **Cài đặt → Quyền riêng tư & Bảo mật → Chế độ nhà phát triển**, bật lên. Máy sẽ khởi động lại và hỏi xác nhận, chọn **Bật**.

### Bước 5. Mở app và kết nối server
1. Trên laptop, chạy sẵn Server và Detector (xem **Phần B**). iPhone và laptop phải dùng **chung WiFi**.
2. Mở app **Pickball Scanner** trên iPhone. Khi hỏi quyền **Camera** và **Mạng cục bộ**, bấm **Cho phép** cả hai.
3. Sửa ô địa chỉ thành `http://<IP-laptop>:3001` (ví dụ `http://192.168.1.25:3001`) rồi bấm **Kết nối**.
4. Chọn phiên kiểm tra → bấm **Bắt đầu**.

**Sau 7 ngày app mở không lên:** cắm iPhone vào máy tính, mở Sideloadly và làm lại **Bước 3** với cùng file IPA.

---

## PHẦN C3 — CHO ĐIỆN THOẠI Ở XA DÙNG CHUNG SERVER (Cloudflare Tunnel)

Dùng khi điện thoại của người khác **không cùng WiFi** với laptop của bạn. Mọi thứ (Server, Web, Detector, máy chiếu) vẫn chạy trên **laptop của bạn**; người kia chỉ cài app trên điện thoại, **không cần cài gì trên máy tính của họ**.

**Trên laptop của bạn (làm mỗi buổi):**
1. Chạy Server như bình thường (Phần B): `npm run dev` và `python scripts/detector_service.py`.
2. Cài `cloudflared` một lần: `winget install --id Cloudflare.cloudflared -e` (đã cài sẵn trên máy này).
3. Mở thêm một terminal và chạy:
   ```powershell
   cloudflared tunnel --url http://localhost:3001
   ```
4. Terminal in ra một địa chỉ dạng **`https://xxxx-xxxx.trycloudflare.com`**. Đó là địa chỉ server cho người ở xa.
5. **Giữ terminal này mở** suốt buổi. Tắt terminal là tắt tunnel.

**Trên điện thoại của người kia:**
1. Cài app (Android: APK, iPhone: Sideloadly, xem Phần C và C2). Android có thể tải APK qua `https://xxxx.trycloudflare.com/download-app`.
2. Mở app, ô địa chỉ server nhập **đúng địa chỉ `https://...trycloudflare.com`** (không thêm `:3001`), bấm **Kết nối**.
3. Chọn phiên thi và quét như bình thường.

**Lưu ý:**
- Địa chỉ miễn phí **đổi mỗi lần chạy lại** lệnh. Mỗi buổi phải gửi địa chỉ mới cho người kia.
- Máy bạn phải **bật suốt buổi**, không để ngủ máy.
- **Bảo mật:** các API quản lý (lớp, đề, học sinh, xuất file, quản trị) đều **yêu cầu đăng nhập** (xem Phần D0), nên người có địa chỉ tunnel chưa đăng nhập không xem hay sửa được dữ liệu. **App điện thoại quét thẻ chưa có đăng nhập**, nên người biết địa chỉ tunnel vẫn xem được danh sách phiên thi và gửi ảnh quét. Chỉ gửi địa chỉ cho người tin cậy và tắt tunnel khi dùng xong.
- Ảnh quét được gửi qua Internet về laptop để Detector đọc, nên mạng yếu sẽ làm quét chậm hơn.

---

## PHẦN D0 — TÀI KHOẢN & TRANG QUẢN TRỊ (đăng nhập web)

Từ phiên bản này, **vào web phải đăng nhập**. Trang đăng nhập: `http://localhost:3000/login`.

**Lần đầu sử dụng**
1. Mở `http://localhost:3000` → tự chuyển sang trang đăng nhập → bấm **Đăng ký**.
2. **Tài khoản đăng ký đầu tiên tự động là quản trị viên (admin)** và vào được ngay.
3. Các tài khoản đăng ký sau là **giáo viên** và ở trạng thái **Chờ duyệt**. Quản trị viên vào **Quản trị → Tài khoản** và bấm **Duyệt** thì họ mới đăng nhập được.
   (Muốn ai đăng ký cũng dùng được ngay, không cần duyệt: đặt biến `REGISTER_REQUIRE_APPROVAL=false` cho server.)

**Quên mật khẩu**
- Trang đăng nhập → **Quên mật khẩu?** → nhập email → hệ thống tạo link đặt lại mật khẩu (hiệu lực **30 phút**, dùng **1 lần**).
- Nếu **chưa cấu hình email (SMTP)**, link **không được gửi đi mà chỉ in ra cửa sổ terminal của server** (dòng `reset-password?token=...`). Quản trị viên mở link đó gửi cho người dùng.
- Cách đơn giản nhất khi không có email: quản trị viên vào **Quản trị → Tài khoản → Sửa** và nhập **mật khẩu mới** cho người đó.
- Muốn gửi email thật, đặt các biến môi trường cho server trước khi chạy (ví dụ trong PowerShell):
  ```powershell
  $env:SMTP_HOST = "smtp.gmail.com"
  $env:SMTP_PORT = "587"
  $env:SMTP_USER = "tai-khoan@gmail.com"
  $env:SMTP_PASS = "mat-khau-ung-dung"
  $env:SMTP_FROM = "Pickball <tai-khoan@gmail.com>"
  $env:WEB_URL   = "http://localhost:3000"   # địa chỉ web dùng để tạo link trong email
  npm run dev
  ```

**Trang quản trị (Dashboard)** — chỉ dành cho admin: `http://localhost:3000/admin` (hoặc nút **Quản trị** trên thanh menu).
Dùng thư viện **react-admin** để quản lý tập trung: **Tài khoản** (duyệt, khóa, đổi vai trò, đặt lại mật khẩu), **Lớp học**, **Học sinh**, **Bộ đề**, **Câu hỏi**, **Phiên thi**, **Bài làm**. Mỗi mục có tìm kiếm, bộ lọc, thêm/sửa/xóa.
> ⚠️ Xóa lớp, bộ đề, câu hỏi hoặc học sinh sẽ xóa luôn dữ liệu liên quan (phiên thi, kết quả). Hộp thoại xác nhận có ghi rõ.

**Quy tắc an toàn đã có sẵn**
- Mật khẩu tối thiểu 8 ký tự, gồm chữ và số; được mã hóa (bcrypt), không lưu bản gốc.
- Đăng nhập sai quá nhiều lần sẽ bị khóa tạm 15 phút.
- Admin không thể tự khóa/xóa/hạ quyền chính mình và luôn phải còn ít nhất 1 admin đang hoạt động.
- Khóa một tài khoản có hiệu lực **ngay lập tức**, kể cả khi người đó đang đăng nhập.
- Khóa bí mật JWT tự sinh và lưu ở `apps/server/data/.jwt-secret` (đã được bỏ qua trong git). Muốn tự đặt, dùng biến `JWT_SECRET` (từ 16 ký tự).

**Điện thoại quét thẻ** hiện **chưa cần đăng nhập** để vẫn hoạt động như trước (chỉ dùng các API phiên thi). Người cùng mạng WiFi/tunnel xem được danh sách phiên thi.

---

## PHẦN D — CHUẨN BỊ TRƯỚC BUỔI HỌC (trên Web)

0. **Đăng nhập** (Phần D0).
1. **Tạo lớp:** vào **Lớp học** (`/classrooms`) → tạo lớp → dán danh sách họ tên từ Excel.
   Hệ thống tự gán thẻ `#01`, `#02`, … theo thứ tự.
2. **In thẻ theo lớp:** vẫn ở trang **Lớp học**, chọn lớp → bấm **Tải Thẻ In Lớp …** → được file PDF mỗi học sinh 1 thẻ (có in họ tên). In giấy bìa A5, nên ép plastic.
   > Khi thêm/bớt học sinh hoặc đổi số thẻ, tải lại file thẻ của lớp.
3. **Phát thẻ** cho học sinh theo **họ tên in trên thẻ**.
4. **Soạn đề:** vào **Đề thi** (`/quizzes`) → tạo bộ đề → thêm câu hỏi, chọn đáp án đúng và thời gian cho từng câu.
5. **Tạo phiên kiểm tra:** vào **Phiên thi** (`/sessions`) → **Tạo phiên** → chọn **Lớp** và **Bộ đề**.

---

## PHẦN E — TỔ CHỨC BUỔI KIỂM TRA

### 🖥️ Trên laptop (nối máy chiếu)
1. Vào **Phiên thi** → bấm **Máy chiếu** ở phiên vừa tạo → nhấn **F11** để phóng toàn màn hình.
2. **Giữ tab này mở suốt buổi**, vì tab này tự khoá câu hỏi khi hết giờ.

### 📱 Trên điện thoại
1. Mở app **Pickball Scanner** → nhập `http://<IP-laptop>:3001` → bấm **Kết nối**.
2. Chọn phiên kiểm tra → bấm **Bắt đầu**.

### 🔁 Vòng lặp cho mỗi câu hỏi

| # | Ai làm | Thao tác |
|---|---|---|
| 1 | GV | Bấm **BẮT ĐẦU** trên máy chiếu (hoặc nút chuyển câu trên điện thoại) → câu hỏi và đồng hồ hiện lên |
| 2 | HS | Xoay thẻ sao cho **chữ cái mình chọn (A/B/C/D) nằm ở cạnh trên**, giơ thẻ trước ngực, không che mã |
| 3 | GV | Trên điện thoại mở **Camera quét**, lia chậm qua cả lớp |
| 4 | HS | Nhìn máy chiếu: ô số thẻ của mình **sáng xanh ✓** là đã được ghi nhận (máy chiếu không lộ đáp án) |
| 5 | Tự động / GV | Hết giờ thì câu hỏi tự khoá. Muốn khoá sớm thì bấm **Khóa câu**. Màn hình hiện đáp án đúng và biểu đồ % |
| 6 | GV | Chữa bài nhanh, rồi bấm **Câu tiếp theo** |

### 🏁 Kết thúc
- Ở câu cuối, bấm **Kết thúc & xem kết quả** → hệ thống chuyển sang trang bảng điểm.
- Bảng điểm có **điểm thang 10, xếp hạng và đáp án từng câu**. Bấm **Xuất Excel** để tải về.

---

## 🧪 Thử nghiệm khi chưa có thẻ giấy
Trong màn hình Camera trên điện thoại có nút **Quét Test**: mỗi lần bấm sẽ giả lập một học sinh (thẻ #1 → #15) nộp bài. Dùng nút này để kiểm tra toàn bộ luồng mà không cần in thẻ.

---

## 🛠️ Gặp lỗi thì làm gì?

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| App báo *"Không thể kết nối đến máy chủ"* | Sai IP, khác WiFi hoặc bị Firewall chặn | Kiểm tra lại IP bằng `ipconfig`, dùng chung WiFi, mở Firewall cho Node.js |
| Camera quay nhưng không nhận thẻ nào | Chưa chạy Detector (Terminal 2) | Chạy `python scripts/detector_service.py` |
| Detector báo lỗi `cv2.aruco` | Thiếu thư viện OpenCV | `pip install opencv-contrib-python` |
| Nhận sai đáp án | Thẻ bị nghiêng, bị che hoặc thiếu sáng | Giơ thẻ thẳng, không che mã, đứng gần hơn |
| Hết giờ mà câu hỏi không khoá | Đã đóng tab máy chiếu | Mở lại tab máy chiếu, hoặc bấm **Khóa câu** trên điện thoại |
| Thẻ quét được nhưng ô không sáng | Số thẻ chưa gán cho học sinh nào trong lớp | Kiểm tra danh sách lớp trên Web |
| Không đăng nhập được: *"Tài khoản đang chờ quản trị viên duyệt"* | Tài khoản mới chưa được duyệt | Admin vào **Quản trị → Tài khoản** bấm **Duyệt** |
| Quên mật khẩu mà không nhận email | Server chưa cấu hình SMTP | Lấy link trong terminal của server, hoặc admin đặt mật khẩu mới trong **Quản trị → Tài khoản** |
| Đăng nhập sai nhiều lần bị báo *"thử lại sau ... phút"* | Cơ chế chống dò mật khẩu | Chờ 15 phút, hoặc admin đặt mật khẩu mới |
| Lỗi cổng 3000/3001 đã bị dùng | Còn chương trình cũ đang chạy | Tắt terminal cũ hoặc khởi động lại máy |
| Sideloadly báo `LOCKDOWN_E_USER_DENIED_PAIRING` | iPhone chưa "Tin cậy" máy tính | Mở khoá iPhone, cắm lại cáp, bấm **Tin cậy**, rồi **Retry** (xem Phần C2, Bước 3) |
| App iPhone mở không lên sau vài ngày | Chứng chỉ Apple ID miễn phí hết hạn sau 7 ngày | Cắm iPhone, mở Sideloadly và cài lại file IPA |

---

## 📌 Tóm tắt siêu ngắn

```
1. npm run dev                               (Terminal 1)
2. python scripts/detector_service.py        (Terminal 2)
3. Web: đăng nhập → tạo lớp → soạn đề → tạo phiên → mở Máy chiếu (F11)
   (lần đầu: Đăng ký — tài khoản đầu tiên là admin; quản lý tài khoản & dữ liệu ở /admin)
4. Điện thoại: nhập http://<IP-laptop>:3001 → chọn phiên
5. BẮT ĐẦU → HS giơ thẻ → GV quét → Khóa → Câu tiếp theo
6. Kết thúc → xem điểm → Xuất Excel
```
