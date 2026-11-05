# 🎯 Pickball — Hệ Thống Trắc Nghiệm Thẻ Giấy Thời Gian Thực (Plickers Clone)

Hệ thống chấm điểm trắc nghiệm trực tiếp trong lớp học sử dụng mã thị giác máy tính **ArUco Marker**, kết nối đồng bộ thời gian thực giữa **Web App (Máy chiếu)**, **Mobile App (Camera quét)** và **Backend Server (Node.js + Socket.io + SQLite)**.

---

## 🌟 Cấu trúc Monorepo

```
pickball/
├── packages/
│   └── shared/          # Types, interfaces và constants WebSocket dùng chung
├── apps/
│   ├── server/          # Backend Express + Socket.io + SQLite (port 3001)
│   ├── web/             # Web App Next.js 16 + Tailwind CSS (port 3000)
│   └── mobile/          # Mobile Scanner Flutter App (Camera + Socket.io)
├── scripts/
│   ├── seed-database.ts         # Script tạo dữ liệu mẫu (1 lớp, 15 HS, 5 câu hỏi)
│   └── generate-aruco-cards.py  # Sinh PDF thẻ ArUco theo danh sách lớp (server gọi khi tải thẻ)
└── docs/
```

---

## 🚀 Hướng dẫn Chạy Hệ Thống

### 1. Khởi động Web & Backend Server đồng thời
Tại thư mục gốc `c:\pickball`:
```bash
npm run dev
```
- **Web App:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:3001](http://localhost:3001)
- **Đăng nhập web:** lần đầu bấm **Đăng ký** ở `/login`, **tài khoản đầu tiên tự thành quản trị viên**; các tài khoản sau cần admin duyệt.
- **Trang quản trị (react-admin):** [http://localhost:3000/admin](http://localhost:3000/admin), quản lý tài khoản, lớp, học sinh, đề, câu hỏi, phiên thi, bài làm (chỉ admin).
- Quên mật khẩu: link đặt lại được gửi qua SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `WEB_URL`); chưa cấu hình thì link in ra terminal của server. Xem chi tiết trong `HUONG_DAN_CHAY.md` (Phần D0).
- **Tải PDF thẻ in theo lớp:** trang **Lớp học** → chọn lớp → **Tải Thẻ In Lớp …** (API: `GET /api/classrooms/:id/cards/pdf`)

### 2. Chạy Mobile App (Điện thoại quét thẻ)
```bash
cd apps/mobile
flutter run
```
> Nhập IP máy tính trong mạng WiFi nội bộ (ví dụ: `http://192.168.1.100:3001`) để điện thoại kết nối vào cùng server với máy chiếu.

### 3. Sinh thẻ in PDF bằng dòng lệnh (tùy chọn)
```bash
python scripts/generate-aruco-cards.py --input lop.json --output the_lop.pdf
```
`lop.json`: `{ "classroom": "10A1", "students": [{ "card_id": 1, "full_name": "Nguyễn Văn A" }] }`.
In ra giấy khổ A5 (14.8 x 21 cm), ép plastic để dùng bền lâu.

---

## 📋 Luồng Vận Hành Lớp Học

1. **Chuẩn bị:** Tải PDF thẻ của lớp ở trang Lớp học, in và phát cho học sinh theo họ tên in trên thẻ.
2. **Trình chiếu:** Giáo viên mở [http://localhost:3000](http://localhost:3000) trên Laptop cắm máy chiếu, chọn phiên thi và ấn **Máy Chiếu** (nhấn F11 để Fullscreen).
3. **Làm bài:** Bấm **BẮT ĐẦU**, câu hỏi và đồng hồ đếm ngược hiển thị trên màn hình lớn.
4. **Học sinh trả lời:** Xoay cạnh chứa chữ cái muốn chọn (A, B, C hoặc D) lên trên cùng và giơ trước ngực.
5. **Giáo viên quét:** Mở ứng dụng điện thoại, lia camera quét cả lớp trong 2 giây. Màn hình máy chiếu sẽ tự động nhảy ô xanh tương ứng các học sinh đã nộp bài.
6. **Xem & Xuất kết quả:** Khi hết giờ, đáp án đúng và biểu đồ phân bố % hiển thị tức thì. Kết thúc bài thi có thể tải file Excel bảng điểm thang 10.
