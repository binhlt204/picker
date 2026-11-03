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
│   ├── generate-aruco-cards.py  # Script sinh file PDF 50 thẻ ArUco in A5
│   └── output/                  # File PDF thẻ đã sinh sẵn sàng in
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
- **Tải PDF 50 Thẻ In:** [http://localhost:3001/api/cards/pdf](http://localhost:3001/api/cards/pdf)

### 2. Chạy Mobile App (Điện thoại quét thẻ)
```bash
cd apps/mobile
flutter run
```
> Nhập IP máy tính trong mạng WiFi nội bộ (ví dụ: `http://192.168.1.100:3001`) để điện thoại kết nối vào cùng server với máy chiếu.

### 3. Sinh lại bộ thẻ in PDF (tùy chọn)
```bash
npm run generate:cards
```
File PDF xuất ra tại `scripts/output/aruco_cards_50.pdf`.
In ra giấy khổ A5 (14.8 x 21 cm) hoặc khổ A4, ép plastic để dùng bền lâu.

---

## 📋 Luồng Vận Hành Lớp Học

1. **Chuẩn bị:** Phát thẻ #01..#50 cho học sinh theo đúng danh sách lớp trên Web.
2. **Trình chiếu:** Giáo viên mở [http://localhost:3000](http://localhost:3000) trên Laptop cắm máy chiếu, chọn phiên thi và ấn **Máy Chiếu** (nhấn F11 để Fullscreen).
3. **Làm bài:** Bấm **BẮT ĐẦU**, câu hỏi và đồng hồ đếm ngược hiển thị trên màn hình lớn.
4. **Học sinh trả lời:** Xoay cạnh chứa chữ cái muốn chọn (A, B, C hoặc D) lên trên cùng và giơ trước ngực.
5. **Giáo viên quét:** Mở ứng dụng điện thoại, lia camera quét cả lớp trong 2 giây. Màn hình máy chiếu sẽ tự động nhảy ô xanh tương ứng các học sinh đã nộp bài.
6. **Xem & Xuất kết quả:** Khi hết giờ, đáp án đúng và biểu đồ phân bố % hiển thị tức thì. Kết thúc bài thi có thể tải file Excel bảng điểm thang 10.
