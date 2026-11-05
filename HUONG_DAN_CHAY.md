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
- Mở `http://localhost:3001`: thấy Dashboard của Server là OK.

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

## PHẦN D — CHUẨN BỊ TRƯỚC BUỔI HỌC (trên Web)

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
| Lỗi cổng 3000/3001 đã bị dùng | Còn chương trình cũ đang chạy | Tắt terminal cũ hoặc khởi động lại máy |

---

## 📌 Tóm tắt siêu ngắn

```
1. npm run dev                               (Terminal 1)
2. python scripts/detector_service.py        (Terminal 2)
3. Web: tạo lớp → soạn đề → tạo phiên → mở Máy chiếu (F11)
4. Điện thoại: nhập http://<IP-laptop>:3001 → chọn phiên
5. BẮT ĐẦU → HS giơ thẻ → GV quét → Khóa → Câu tiếp theo
6. Kết thúc → xem điểm → Xuất Excel
```
