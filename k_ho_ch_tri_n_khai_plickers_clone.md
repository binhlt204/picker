# KẾ HOẠCH PHÁT TRIỂN HỆ THỐNG TRẮC NGHIỆM THẺ GIẤY THỜI GIAN THỰC (PLICKERS CLONE)

---

## 1. TỔNG QUAN HỆ THỐNG & TECH STACK

Hệ thống hoạt động theo mô hình đồng bộ thời gian thực:
- **Web App (Laptop/Máy chiếu):** Quản lý lớp, soạn câu hỏi không giới hạn, điều khiển phiên làm bài, hiển thị câu hỏi, bộ đếm ngược (countdown timer) và xuất kết quả.
- **Mobile App (iOS/Android):** Đóng vai trò máy quét camera, nhận diện mã thẻ ArUco trực tiếp trên thiết bị (On-device CV) và đẩy kết quả tức thì về Web.

```
┌─────────────────────────────────┐           WebSocket            ┌──────────────────────────────────┐
│  Mobile App Scanner             │ ─────────────────────────────> │  Web App (Projector View)        │
│  - Flutter + opencv_dart        │  Event: "SUBMIT_ANSWER"        │  - Next.js 14 / React            │
│  - Trích xuất: ID + Góc xoay    │                                │  - Timer Countdown               │
└─────────────────────────────────┘                                │  - Grid hiển thị học sinh        │
                                                                   └──────────────────────────────────┘
                                                                                    │
                                                                                    ▼
                                                                   ┌──────────────────────────────────┐
                                                                   │  Database (Supabase / Postgres)  │
                                                                   │  - Schema: Lớp, Đề, Điểm số      │
                                                                   └──────────────────────────────────┘
```

### Công nghệ Lựa chọn

| Tầng hệ thống | Công nghệ đề xuất | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Mobile App** | **Flutter** (Dart) + `opencv_dart` / native C++ FFI | Viết 1 lần chạy cả Android và iOS; xử lý frame hình ảnh tốc độ 30-60 FPS. |
| **Web Client** | **Next.js 14** (App Router) + Tailwind CSS | Xây dựng giao diện nhanh, hỗ trợ Server-Side Rendering và Fullscreen API mượt mà. |
| **Realtime Engine** | **Socket.io** (Node.js) hoặc **Supabase Realtime** | Độ trễ dưới 50ms khi phát hiện thẻ và cập nhật lên màn chiếu. |
| **Cơ sở dữ liệu** | **PostgreSQL** (hoặc Supabase) | Lưu trữ quan hệ chặt chẽ giữa Lớp học - Học sinh - Phiên làm bài - Điểm số. |
| **Thẻ mã hóa** | **ArUco Marker** (`DICT_4X4_50`) | Kích thước bit nhỏ, góc cạnh rõ, nhận diện xa tốt hơn QR Code truyền thống. |

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

```sql
-- 1. Bảng Lớp học
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng Học sinh (Mỗi học sinh gắn liền với 1 mã thẻ card_id từ 1 đến 50)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    card_id INT NOT NULL, -- Số thứ tự in trên thẻ ArUco
    full_name VARCHAR(150) NOT NULL,
    CONSTRAINT unique_card_per_class UNIQUE(classroom_id, card_id)
);

-- 3. Bảng Bộ câu hỏi (Quiz)
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng Chi tiết câu hỏi (Không giới hạn số câu)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_order INT NOT NULL,
    content TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    time_limit INT DEFAULT 30 -- Thời gian tính bằng giây
);

-- 5. Bảng Phiên kiểm tra thực tế (Session)
CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id),
    quiz_id UUID REFERENCES quizzes(id),
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Bảng Kết quả từng câu của học sinh
CREATE TABLE session_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    student_id UUID REFERENCES students(id),
    selected_option CHAR(1) CHECK (selected_option IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_student_per_question UNIQUE(session_id, question_id, student_id)
);
```

---

## 3. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

### 3.1. Giao diện Nhập danh sách lớp (Web)
* **Thành phần:** 
  * 1 ô `textarea` lớn cho phép dán (paste) trực tiếp danh sách tên học sinh từ Excel.
  * Tự động phân tách từng dòng thành các `card_id` từ 1, 2, 3... tương ứng.
  * Nút "Tải bộ 50 thẻ ArUco (PDF)" để in ngay.

### 3.2. Giao diện Soạn đề & Cài đặt thời gian (Web)
* **Thành phần:**
  * Nhập không giới hạn số lượng câu hỏi.
  * Mỗi câu gồm: Nội dung câu hỏi, 4 phương án, nút chọn đáp án đúng (A/B/C/D), ô nhập thời gian: `[ 30 ] giây`.
  * Nút "Xuất file đáp án" (.xlsx hoặc in trực tiếp ra giấy).

### 3.3. Màn hình Trình chiếu Máy chiếu (Projector Fullscreen View)
* **Phần trên (Header):** Tên câu hỏi hiện tại, Tiến độ (`Câu 3/20`), Đồng hồ đếm ngược hình tròn (khi còn < 5s chuyển sang màu đỏ nhấp nháy).
* **Phần giữa (Body):** 4 khối đáp án A, B, C, D to, rõ ràng, tương phản cao.
* **Phần dưới (Footer):** Lưới các ô vuông đánh số từ 1 đến $N$ đại diện cho từng học sinh:
  * Màu xám: Chưa nộp.
  * Màu xanh dương đậm: Đã quét nhận bài (không hiển thị đáp án học sinh chọn để tránh lộ bài).
* **Trạng thái hết giờ (Time-out):** Màn hình tự động khóa quét, chuyển ô đáp án đúng sang màu xanh lá cây, hiện biểu đồ cột tỉ lệ chọn % A - B - C - D.

### 3.4. Giao diện Quét Camera (Mobile App)
* **Phần khung quét (Viewfinder):** Toàn màn hình camera, vẽ bounding box quanh các thẻ ArUco nhận diện được, kèm nhãn nhỏ: `#01 - A`, `#05 - C`.
* **Phần trạng thái (Bottom Bar):** 
  * Chỉ số nộp bài: `Đã nộp: 38/42 học sinh`.
  * Nút điều khiển: "Khóa câu hỏi", "Câu tiếp theo" (giáo viên bấm trên điện thoại thì máy tính tự chuyển câu).

---

## 4. CHI TIẾT TRIỂN KHAI CODE CỐT LÕI

### 4.1. Thuật toán nhận diện & Giải mã góc xoay ArUco (Python / OpenCV Reference)

```python
import cv2
import numpy as np

# Sử dụng từ điển DICT_4X4_50
aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
parameters = cv2.aruco.DetectorParameters()
detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)

def detect_cards(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    corners, ids, rejected = detector.detectMarkers(gray)
    
    results = []
    if ids is not None:
        for i in range(len(ids)):
            card_id = int(ids[i][0])
            corner = corners[i][0] # 4 đỉnh: [p0, p1, p2, p3] theo chiều kim đồng hồ
            
            # Vector cạnh trên của thẻ (từ p0 đến p1)
            p0 = corner[0]
            p1 = corner[1]
            dx = p1[0] - p0[0]
            dy = p1[1] - p0[1]
            
            # Tính góc xoay (radian -> degree)
            angle = np.degrees(np.arctan2(dy, dx))
            
            # Quy ước đáp án dựa theo góc xoay so với phương ngang
            if -45 <= angle <= 45:
                answer = "A"
            elif 45 < angle <= 135:
                answer = "B"
            elif angle > 135 or angle <= -135:
                answer = "C"
            else:
                answer = "D"
                
            results.append({"card_id": card_id, "answer": answer})
            
    return results
```

---

### 4.2. Logic WebSocket Server điều phối Real-time (Node.js)

```javascript
// server.js
const { Server } = require("socket.io");
const io = new Server(3001, { cors: { origin: "*" } });

let currentSession = {
  sessionId: null,
  currentQuestionId: null,
  isLocked: false,
  answers: {} // { studentId: "A" }
};

io.on("connection", (socket) => {
  // Máy tính tham gia làm màn hình chiếu
  socket.on("join_as_projector", (sessionId) => {
    socket.join(`session_${sessionId}`);
  });

  // Chuyển câu hỏi & đặt lại timer
  socket.on("next_question", ({ sessionId, questionId, timeLimit }) => {
    currentSession = { sessionId, currentQuestionId: questionId, isLocked: false, answers: {} };
    io.to(`session_${sessionId}`).emit("question_started", { questionId, timeLimit });
  });

  // Nhận kết quả quét từ Mobile
  socket.on("submit_scanned_batch", ({ sessionId, questionId, records }) => {
    if (currentSession.isLocked || currentSession.currentQuestionId !== questionId) return;

    records.forEach(({ cardId, answer }) => {
      currentSession.answers[cardId] = answer;
    });

    // Bắn cập nhật về máy chiếu chỉ gồm danh sách ID đã nộp (ẩn đáp án cụ thể)
    io.to(`session_${sessionId}`).emit("update_submitted_students", {
      submittedCardIds: Object.keys(currentSession.answers).map(Number)
    });
  });

  // Hết giờ hoặc Giáo viên ấn đóng câu hỏi
  socket.on("lock_question", ({ sessionId }) => {
    currentSession.isLocked = true;
    io.to(`session_${sessionId}`).emit("question_locked", {
      finalAnswers: currentSession.answers
    });
  });
});
```

---

### 4.3. Logic Bộ đếm thời gian & Hiển thị trên Máy chiếu (React / Next.js)

```tsx
// components/ProjectorView.tsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io("http://localhost:3001");

export default function ProjectorView({ question, sessionId }: any) {
  const [timeLeft, setTimeLeft] = useState(question.time_limit);
  const [submittedCards, setSubmittedCards] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    setTimeLeft(question.time_limit);
    setIsLocked(false);
    setSubmittedCards([]);

    socket.emit("join_as_projector", sessionId);

    socket.on("update_submitted_students", (data) => {
      setSubmittedCards(data.submittedCardIds);
    });

    socket.on("question_locked", () => {
      setIsLocked(true);
    });

    return () => {
      socket.off("update_submitted_students");
      socket.off("question_locked");
    };
  }, [question, sessionId]);

  // Bộ đếm lùi thời gian
  useEffect(() => {
    if (timeLeft <= 0 || isLocked) {
      if (!isLocked) {
        setIsLocked(true);
        socket.emit("lock_question", { sessionId });
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isLocked]);

  return (
    <div className="h-screen w-screen bg-slate-900 text-white p-8 flex flex-col justify-between">
      {/* Top Header & Countdown */}
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold">{question.content}</h1>
        <div className={`text-4xl font-black px-6 py-2 rounded-lg ${timeLeft <= 5 ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}>
          {timeLeft}s
        </div>
      </div>

      {/* Grid Danh sách các ô học sinh */}
      <div className="grid grid-cols-10 gap-3 my-6">
        {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => {
          const isSubmitted = submittedCards.includes(id);
          return (
            <div
              key={id}
              className={`h-12 flex items-center justify-center font-bold rounded text-lg transition-all ${
                isSubmitted ? 'bg-emerald-500 text-white scale-105' : 'bg-slate-800 text-slate-500'
              }`}
            >
              #{id}
            </div>
          );
        })}
      </div>

      {/* Hiển thị kết quả khi hết thời gian */}
      {isLocked && (
        <div className="p-4 bg-emerald-950 border border-emerald-500 rounded text-center text-xl font-bold">
          Hết thời gian! Đáp án đúng: {question.correct_option}
        </div>
      )}
    </div>
  );
}
```

---

## 5. LỊCH TRÌNH THỰC HIỆN THEO NGÀY (SPRINT 10 NGÀY)

```
Tuần 1: Lõi Nhận diện & Tạo Dữ liệu
  ├── Ngày 1: Tạo Script sinh 50 mã ArUco DICT_4X4_50 -> Export PDF thẻ in.
  ├── Ngày 2: Dựng Database Schema trên Supabase/PostgreSQL.
  ├── Ngày 3: Viết Web Dashboard: Tạo lớp (paste danh sách học sinh) & Soạn câu hỏi.
  ├── Ngày 4: Tích hợp thư viện OpenCV vào dự án Mobile (Flutter).
  └── Ngày 5: Kiểm thử thuật toán tính góc xoay trên camera điện thoại.

Tuần 2: Đồng bộ Thời gian thực & Tích hợp Thiết bị
  ├── Ngày 6: Xây dựng WebSocket Server (kênh giao tiếp Mobile - Web).
  ├── Ngày 7: Dựng giao diện Fullscreen cho Máy chiếu (Grid học sinh + Timer).
  ├── Ngày 8: Tích hợp luồng hết giờ tự động khóa quét và hiển thị đáp án.
  ├── Ngày 9: Viết module xuất bảng điểm tổng kết ra Excel/CSV.
  └── Ngày 10: Test thực tế trong phòng học có máy chiếu (kiểm tra góc nghiêng, cự ly 6-8m).
```

---

## 6. QUY CÁCH IN THẺ GIẤY ĐỂ CAMERA BẮT NHẠY NHẤT

1. **Kích thước in:** Khuyến nghị khổ **A5** (1/2 tờ A4) cho lớp học từ 35-50 học sinh để camera điện thoại ở bục giảng có thể bắt được hàng ghế cuối (khoảng cách 6-8 mét).
2. **Loại giấy:** Giấy bìa cứng (định lượng từ 160gsm đến 250gsm), bề mặt cán mờ (**Matte**). Tuyệt đối **không** cán màng bóng (Glossy) vì ánh sáng đèn tuýp trần lớp học sẽ phản xạ gây lóa mờ mã marker.
3. **Ký hiệu 4 góc:**
   * Mặt trước: In mã ArUco ở giữa, viền trắng xung quanh tối thiểu 1.5cm. In 4 chữ cái A, B, C, D mờ ở 4 mép ngoài.
   * Mặt sau: In số thứ tự thẻ (VD: Thẻ #05) và bảng hướng dẫn thu nhỏ để học sinh biết chính xác mình đang xoay hướng nào lên trên mà không để lộ đáp án cho bạn bên cạnh.