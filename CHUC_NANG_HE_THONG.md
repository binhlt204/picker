# 📋 TÀI LIỆU ĐẶC TẢ CHỨC NĂNG DỰ ÁN LB HOUSE
### Hệ Thống Trắc Nghiệm Thẻ Giấy Thời Gian Thực (Realtime Paper Quiz System)

---

## 1. TỔNG QUAN HỆ THỐNG

**LB HOUSE** là giải pháp kiểm tra trắc nghiệm tương tác trực tiếp trong lớp học, lấy cảm hứng từ Plickers nhưng được thiết kế hiện đại, tốc độ cao và tối ưu riêng cho môi trường giáo dục tại Việt Nam:
* **Học sinh KHÔNG cần điện thoại hay máy tính:** Mỗi học sinh chỉ dùng một tấm thẻ giấy in mã thị giác máy tính **ArUco Marker**. Khi chọn đáp án A, B, C hoặc D, học sinh chỉ cần xoay cạnh tương ứng lên trên cùng.
* **Giáo viên dùng điện thoại quét camera:** Lia camera 1 vòng qua lớp học trong 1 - 2 giây để thu nhận toàn bộ kết quả của 40 - 50 học sinh cùng lúc.
* **Máy chiếu phòng học hiển thị kết quả tức thì:** Màn hình lớn đếm ngược, hiển thị danh sách nộp bài trực tiếp qua WebSocket độ trễ dưới 50ms, tự động khóa câu hỏi và hiển thị biểu đồ phân tích khi hết giờ.
* **Tự động chấm điểm & xuất Excel:** Tính điểm thang 10, xếp hạng học sinh và xuất file Excel hoàn chỉnh phục vụ sổ điểm.

---

## 2. KIẾN TRÚC & LUỒNG DỮ LIỆU THỜI GIAN THỰC

```
                      ┌────────────────────────────────────────┐
                      │        📱 Mobile App Scanner           │
                      │  (Camera quét thẻ ArUco của học sinh)  │
                      └──────────────────┬─────────────────────┘
                                         │
                                         │ WebSocket: "submit_scanned_batch"
                                         │ (Gửi batch mỗi 200ms: cardId + answer)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          🖥️ Backend Server             │
                      │        (Node.js + Socket.io)           │
                      │        (SQLite: lbhouse.db)           │
                      └──────────────────┬─────────────────────┘
                                         │
                                         │ WebSocket: "update_submitted_students"
                                         │ (Chỉ gửi danh sách số thẻ đã nộp, GIẤU đáp án)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │       📺 Web App (Máy chiếu lớp học)   │
                      │      (Next.js 16 + Tailwind CSS)       │
                      │    - Lưới 50 thẻ học sinh sáng xanh    │
                      │    - Đồng hồ tròn đếm ngược            │
                      │    - Biểu đồ phân tích khi hết giờ     │
                      └────────────────────────────────────────┘
```

---

## 3. DANH SÁCH CHI TIẾT CÁC PHÂN HỆ & CHỨC NĂNG

### 🔹 Phân hệ 1: Quản lý Lớp học & Thẻ học sinh (`/classrooms`)
Quản lý danh sách lớp và gán số thẻ cố định cho từng học sinh.

| Chức năng | Mô tả chi tiết |
| :--- | :--- |
| **Quản lý danh sách lớp** | Thêm mới lớp học (ví dụ: `10A1`, `11 Chuyên Lý`), đổi tên hoặc xóa lớp học (tự động xóa dữ liệu liên quan). |
| **Gán thẻ học sinh (1 - 50)** | Mỗi học sinh trong lớp được gán duy nhất một mã số thẻ từ `#01` đến `#50` tương ứng mã ArUco in trên giấy. Tránh trùng lặp mã thẻ trong cùng một lớp. |
| **Dán danh sách từ Excel (Bulk Import)** | Cho phép giáo viên copy cột họ tên từ file Excel và dán trực tiếp vào hệ thống. Hệ thống tự động gán mã thẻ `#01`, `#02`... liên tục chỉ trong 1 thao tác. |
| **Thêm / Xóa từng học sinh** | Linh hoạt thêm học sinh chuyển đến hoặc xóa học sinh chuyển lớp. |
| **Tải thẻ in PDF trực tiếp** | Nút tải file PDF 50 thẻ ngay trên trang quản lý lớp. |

---

### 🔹 Phân hệ 2: Ngân hàng Đề thi & Soạn câu hỏi (`/quizzes`)
Quản lý các bộ câu hỏi phục vụ kiểm tra 15 phút, 1 tiết, khảo sát đầu giờ.

| Chức năng | Mô tả chi tiết |
| :--- | :--- |
| **Quản lý bộ đề thi** | Tạo các bộ đề theo môn học, chương trình, ngày tháng. Không giới hạn số lượng bộ đề. |
| **Soạn câu hỏi không giới hạn** | Thêm câu hỏi với nội dung chi tiết và 4 lựa chọn đáp án: **A, B, C, D**. |
| **Thiết lập đáp án đúng** | Chỉ định đáp án chuẩn (A, B, C hoặc D) dùng để chấm điểm tự động. |
| **Tùy chỉnh thời gian trả lời** | Cài đặt thời gian đếm ngược riêng cho từng câu (từ 5 đến 180 giây), phù hợp cho câu dễ (15s) hoặc câu tính toán (45s, 60s). |
| **Xem trước & Quản lý câu hỏi** | Xem danh sách các câu hỏi, thứ tự câu (Câu 1, Câu 2...), xóa hoặc chỉnh sửa câu hỏi nhanh chóng. |

---

### 🔹 Phân hệ 3: Màn hình Trình chiếu Máy chiếu (`/sessions/projector/[id]`)
Giao diện trung tâm đặt trên Laptop nối máy chiếu, tối ưu hiển thị rõ nét từ khoảng cách xa trong lớp học.

| Chức năng | Mô tả chi tiết |
| :--- | :--- |
| **Đồng hồ đếm ngược tròn (Countdown Timer)** | Vòng tròn SVG đếm ngược mượt mà. Khi còn dưới 5 giây, vòng tròn tự động chuyển sang **màu đỏ cảnh báo kèm hiệu ứng nhấp nháy (pulse)**. |
| **Bố cục 4 đáp án tương phản cao** | 4 khối lựa chọn với màu nhận diện chuẩn: **A (Xanh dương)**, **B (Vàng cam)**, **C (Đỏ)**, **D (Xanh lá)**. Cỡ chữ lớn, rõ nét. |
| **Lưới 50 thẻ học sinh Realtime** | Hiển thị dạng lưới thẻ từ `#01` đến `#50` (hoặc theo sĩ số lớp):<br>• Khi học sinh được quét: Ô thẻ lập tức **sáng xanh lá + hiện dấu tick `✓`**.<br>• Học sinh tự nhìn lên máy chiếu để biết bài của mình đã được máy ghi nhận mà không cần hỏi giáo viên. |
| **Cơ chế chống nhìn bài (Anti-cheat)** | Trong suốt thời gian đếm ngược, máy chiếu **chỉ hiện ai đã nộp bài**, hoàn toàn **giấu đáp án học sinh đang chọn** để tránh các bạn khác nhìn trộm. |
| **Tự động khóa & Bật mí đáp án** | Khi hết thời gian đếm ngược (hoặc giáo viên bấm nút Khóa):<br>• Ô đáp án đúng phát sáng viền xanh lá kèm nhãn `✓ ĐÚNG`.<br>• Tự động hiển thị phân bố % học sinh chọn từng đáp án A, B, C, D.<br>• Trên lưới thẻ hiện rõ từng em trả lời đúng (xanh) hay sai (đỏ). |
| **Biểu đồ thống kê kết quả câu hỏi** | Hiển thị tổng số bài đã nộp, số em trả lời đúng, số em sai, tỷ lệ % chính xác của cả lớp để giáo viên sửa bài ngay tại chỗ. |
| **Chế độ Toàn màn hình (Fullscreen)** | Tích hợp nút phóng toàn màn hình hoặc ấn phím **F11**, tự động ẩn toàn bộ thanh điều hướng để biến màn hình thành bảng điện tử chuyên nghiệp. |
| **Điều khiển chuyển câu linh hoạt** | Nút **"Bắt đầu"**, **"Khóa câu hỏi"**, **"Câu tiếp theo"** hiển thị thông minh theo trạng thái bài thi. |

---

### 🔹 Phân hệ 4: Ứng dụng Điện thoại Quét thẻ (`apps/mobile`)
Công cụ cầm tay của giáo viên, biến camera điện thoại thành máy chấm thi tốc độ cao.

| Chức năng | Mô tả chi tiết |
| :--- | :--- |
| **Cấu hình kết nối WiFi nội bộ** | Nhập địa chỉ IP máy tính (ví dụ: `http://192.168.1.100:3001`). Điện thoại và máy tính chỉ cần bắt chung mạng WiFi trường học. |
| **Danh sách phiên thi khả dụng** | Tự động lấy danh sách các phiên kiểm tra đang mở để giáo viên chọn và bắt đầu quét. |
| **Camera quét thẻ liên tục (Live Camera Feed)** | Bật camera quét liên tục 30 FPS, nhận diện nhiều thẻ cùng lúc trong 1 góc nhìn của lớp. |
| **Thuật toán giải mã góc xoay ArUco** | Nhận diện mã thẻ ArUco `DICT_4X4_100` và tính toán góc nghiêng hình học để phân loại chuẩn xác ra đáp án **A, B, C, D**. |
| **Gom gói gửi theo Batch (Batch Submit)** | Gom các thẻ quét được trong mỗi 200ms thành một gói gửi lên server qua WebSocket, giúp tiết kiệm băng thông và không bao giờ bị nghẽn mạng. |
| **Lọc trùng lặp thông minh (Deduplication)** | Mỗi học sinh chỉ ghi nhận 1 đáp án cho mỗi câu hỏi, không bị gửi trùng khi lia camera nhiều lần qua một bạn. |
| **Điều khiển từ xa trên điện thoại** | Giáo viên có thể bấm **"Khóa câu hỏi"** hoặc chuyển câu trực tiếp từ điện thoại khi đang đứng ở cuối lớp mà không cần chạm vào máy tính. |
| **Chế độ "Quét Test" mô phỏng** | Tích hợp sẵn nút mô phỏng quét dữ liệu giúp giáo viên hoặc người phát triển kiểm thử toàn bộ luồng mà không cần in thẻ giấy. |

---

### 🔹 Phân hệ 5: Bảng Kết quả, Thống kê & Xuất Excel (`/results/[sessionId]`)
Trang báo cáo chi tiết sau khi kết thúc buổi kiểm tra.

| Chức năng | Mô tả chi tiết |
| :--- | :--- |
| **Thẻ chỉ số tổng quan (KPI Cards)** | Tổng số học sinh dự thi, Điểm trung bình lớp, Tỷ lệ trả lời đúng trung bình, Điểm cao nhất, Điểm thấp nhất. |
| **Bảng điểm học sinh chi tiết** | Danh sách đầy đủ học sinh trong lớp:<br>• Số thẻ (`#01`, `#02`...)<br>• Họ và tên<br>• Từng câu hỏi (C1, C2, C3...): Hiển thị rõ học sinh chọn đáp án gì, đúng (xanh lá) hay sai (đỏ).<br>• Tổng số câu đúng / Tổng số câu.<br>• Điểm quy đổi tự động sang **Thang điểm 10**.<br>• **Xếp hạng:** Tự động xếp hạng 1, 2, 3... theo thứ tự điểm số từ cao xuống thấp. |
| **Xuất file Excel (.xlsx)** | Tải bảng điểm chuẩn định dạng Microsoft Excel, có tiêu đề trường lớp, ngày thi, định dạng màu sắc đẹp mắt sẵn sàng in hoặc dán vào phần mềm quản lý điểm. |
| **Xuất file CSV (.csv)** | Tải định dạng dữ liệu bảng thuần túy phục vụ lưu trữ hoặc tích hợp vào hệ thống khác. |

---

### 🔹 Phân hệ 6: Công cụ Sinh Thẻ Giấy ArUco In Ấn (`scripts/generate-aruco-cards.py`)
Bộ công cụ tạo sẵn bộ thẻ in chuẩn quốc tế.

| Chức năng | Mô tả chi tiết |
| :--- | :--- |
| **Tập tin PDF hoàn chỉnh 51 trang** | Tự động xuất file tại `scripts/output/aruco_cards_50.pdf`. |
| **Trang 1: Hướng dẫn sử dụng chuẩn** | Bìa hướng dẫn quy ước xoay thẻ A-B-C-D trực quan, các lưu ý cho học sinh (cầm mép thẻ, không che ngón tay vào mã) và hướng dẫn in ấn cho giáo viên. |
| **Trang 2 đến 51: 50 thẻ ArUco độc lập** | 50 thẻ chuẩn khổ A5 (`#01` đến `#50`), nhãn chữ A, B, C, D in mờ 4 cạnh vừa đủ cho học sinh đọc mà không gây nhiễu cho camera. |
| **Tải về 1 click qua Web API** | Endpoint `/api/cards/pdf` cho phép bất kỳ giáo viên nào cũng có thể tải file PDF về máy chỉ bằng 1 cú click chuột. |

---

## 4. BẢNG SO SÁNH: LB HOUSE VỚI CÁC PHƯƠNG PHÁP KHÁC

| Tiêu chí | Kiểm tra giấy truyền thống | Kahoot / Quizizz | Plickers quốc tế | **LB HOUSE System** |
| :--- | :---: | :---: | :---: | :---: |
| **Thiết bị học sinh cần** | Bút, giấy | Điện thoại / Máy tính + 4G/Wifi | Thẻ giấy | **Chỉ cần thẻ giấy (In 1 lần dùng cả năm)** |
| **Chi phí triển khai** | Tốn giấy in mỗi lần thi | Rất tốn kém (mua máy/mạng) | Giới hạn 5 câu hỏi nếu dùng miễn phí | **Hoàn toàn Miễn phí & Mã nguồn mở** |
| **Số lượng câu hỏi** | Giới hạn theo đề in | Tùy gói | Giới hạn bản Free | **Không giới hạn số câu hỏi** |
| **Thời gian có điểm** | Vài tiếng đến vài ngày chấm | Ngay lập tức | Ngay lập tức | **Tức thì (dưới 2 giây sau khi quét)** |
| **Bảo mật đáp án khi giơ thẻ** | Có thể bị nhìn trộm | Nhìn màn hình bạn | Chữ in nhỏ khó nhìn | **Chữ in mờ thông minh, không lộ trên máy chiếu** |
| **Khả năng xuất điểm** | Nhập tay thủ công | Có xuất Excel | Phải trả phí Pro | **Xuất Excel (.xlsx) thang điểm 10 miễn phí** |
| **Độ trễ hệ thống** | — | 1 - 3 giây | 1 - 2 giây | **Cực thấp (< 50ms qua WebSocket)** |

---

## 5. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### Khởi động Web & Server:
Tại thư mục gốc `thư mục dự án`:
```bash
npm run dev
```
* **Màn hình Web (Giáo viên / Máy chiếu):** `http://localhost:3000`
* **API Backend Server:** `http://localhost:3001`
* **Tải file PDF 50 thẻ in:** `http://localhost:3001/api/cards/pdf`

### Khởi động Mobile Scanner (Điện thoại):
```bash
cd apps/mobile
flutter run
```
*(Điện thoại nhập địa chỉ IP WiFi máy tính, ví dụ: `http://192.168.1.100:3001` để đồng bộ)*
