# KẾ HOẠCH PHÁT TRIỂN HỆ THỐNG TRẮC NGHIỆM THẺ GIẤY THỜI GIAN THỰC (PLICKERS CLONE)

**Phiên bản:** 2.0 — Kế hoạch chi tiết đầy đủ  
**Kiến trúc:** Fullstack Monorepo  
**Database:** SQLite (Prototype) → PostgreSQL (Production)  
**Cập nhật:** 02/11/2026

---

## MỤC LỤC

1. [Tổng quan hệ thống & Tech Stack](#1-tổng-quan-hệ-thống--tech-stack)
2. [Cấu trúc thư mục Monorepo](#2-cấu-trúc-thư-mục-monorepo)
3. [Hướng dẫn Setup môi trường Dev từ A-Z](#3-hướng-dẫn-setup-môi-trường-dev-từ-a-z)
4. [Kiến trúc cơ sở dữ liệu (SQLite)](#4-kiến-trúc-cơ-sở-dữ-liệu-sqlite)
5. [API Endpoints chi tiết (REST + WebSocket)](#5-api-endpoints-chi-tiết-rest--websocket)
6. [Thiết kế giao diện & Wireframe chi tiết](#6-thiết-kế-giao-diện--wireframe-chi-tiết)
7. [Chi tiết triển khai Code cốt lõi](#7-chi-tiết-triển-khai-code-cốt-lõi)
8. [Lịch trình thực hiện (Sprint 14 ngày)](#8-lịch-trình-thực-hiện-sprint-14-ngày)
9. [Quy cách in thẻ giấy](#9-quy-cách-in-thẻ-giấy)
10. [Hướng dẫn Deploy Production](#10-hướng-dẫn-deploy-production)

---

## 1. TỔNG QUAN HỆ THỐNG & TECH STACK

### 1.1. Kiến trúc tổng thể

Hệ thống hoạt động theo mô hình đồng bộ thời gian thực:
- **Web App (Laptop/Máy chiếu):** Quản lý lớp, soạn câu hỏi không giới hạn, điều khiển phiên làm bài, hiển thị câu hỏi, bộ đếm ngược (countdown timer) và xuất kết quả.
- **Mobile App (iOS/Android):** Đóng vai trò máy quét camera, nhận diện mã thẻ ArUco trực tiếp trên thiết bị (On-device CV) và đẩy kết quả tức thì về Web.

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                              PLICKERS CLONE - SYSTEM ARCHITECTURE                        │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌─────────────────────────┐     WebSocket (Socket.io)     ┌───────────────────────────┐  │
│  │  📱 Mobile App Scanner  │ ───────────────────────────>  │  🖥️  Backend Server        │  │
│  │  Flutter + opencv_dart  │  Event: "SUBMIT_ANSWER"       │  Node.js + Express        │  │
│  │  On-device ArUco detect │ <───────────────────────────  │  Socket.io + SQLite       │  │
│  └─────────────────────────┘  Event: "QUESTION_STARTED"    │  Port: 3001               │  │
│                                                             └─────────┬─────────────────┘  │
│                                                                       │                    │
│                                                              WebSocket│+ REST API          │
│                                                                       │                    │
│                                                             ┌─────────▼─────────────────┐  │
│                                                             │  🖥️  Web App (Projector)   │  │
│                                                             │  Next.js 14 (App Router)  │  │
│                                                             │  Timer + Grid + Dashboard │  │
│                                                             │  Port: 3000               │  │
│                                                             └───────────────────────────┘  │
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              📁 SQLite Database (data.db)                           │   │
│  │  Tables: classrooms | students | quizzes | questions | exam_sessions | answers      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2. Công nghệ Lựa chọn

| Tầng hệ thống | Công nghệ | Phiên bản | Lý do lựa chọn |
| :--- | :--- | :--- | :--- |
| **Mobile App** | Flutter (Dart) + `opencv_dart` | Flutter 3.x | Viết 1 lần chạy cả Android và iOS; xử lý frame 30-60 FPS |
| **Web Client** | Next.js 14 (App Router) + Tailwind CSS | Next.js 14.x | SSR, App Router, Fullscreen API |
| **Backend** | Node.js + Express + Socket.io | Node 20 LTS | WebSocket realtime, REST API đơn giản |
| **Database (Dev)** | SQLite via `better-sqlite3` | — | Zero-config, file-based, prototype nhanh |
| **Database (Prod)** | PostgreSQL (Supabase/Neon) | 15+ | Quan hệ chặt chẽ, scale tốt |
| **Realtime** | Socket.io | 4.x | Độ trễ < 50ms, fallback polling |
| **Thẻ mã hóa** | ArUco Marker (`DICT_4X4_50`) | OpenCV 4.x | Góc cạnh rõ, nhận diện xa 6-8m |
| **PDF Gen** | `pdfkit` hoặc `jspdf` | — | Sinh PDF thẻ ArUco để in |

---

## 2. CẤU TRÚC THƯ MỤC MONOREPO

```
pickball/
├── 📄 package.json                  # Root workspace config
├── 📄 turbo.json                    # Turborepo config (optional)
├── 📄 .gitignore
├── 📄 .env.example                  # Biến môi trường mẫu
├── 📄 README.md
│
├── 📁 packages/                     # Shared packages
│   └── 📁 shared/                   # Types & constants dùng chung
│       ├── 📄 package.json
│       ├── 📁 src/
│       │   ├── 📄 types.ts          # Interface: Student, Question, Session...
│       │   ├── 📄 constants.ts      # SOCKET_EVENTS, ANSWER_OPTIONS...
│       │   └── 📄 index.ts          # Re-export all
│       └── 📄 tsconfig.json
│
├── 📁 apps/
│   ├── 📁 server/                   # ===== BACKEND SERVER =====
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   ├── 📁 src/
│   │   │   ├── 📄 index.ts          # Entry point: Express + Socket.io
│   │   │   ├── 📄 database.ts       # SQLite setup & migration
│   │   │   ├── 📁 routes/           # REST API routes
│   │   │   │   ├── 📄 classrooms.ts
│   │   │   │   ├── 📄 students.ts
│   │   │   │   ├── 📄 quizzes.ts
│   │   │   │   ├── 📄 questions.ts
│   │   │   │   ├── 📄 sessions.ts
│   │   │   │   └── 📄 export.ts     # Xuất Excel/CSV
│   │   │   ├── 📁 socket/           # WebSocket event handlers
│   │   │   │   ├── 📄 sessionHandler.ts
│   │   │   │   └── 📄 scanHandler.ts
│   │   │   ├── 📁 services/         # Business logic
│   │   │   │   ├── 📄 classroomService.ts
│   │   │   │   ├── 📄 quizService.ts
│   │   │   │   ├── 📄 sessionService.ts
│   │   │   │   └── 📄 exportService.ts
│   │   │   └── 📁 utils/
│   │   │       ├── 📄 aruco-pdf.ts  # Sinh PDF thẻ ArUco
│   │   │       └── 📄 helpers.ts
│   │   └── 📁 data/
│   │       └── 📄 .gitkeep          # Thư mục chứa file SQLite
│   │
│   ├── 📁 web/                      # ===== WEB APP (NEXT.JS) =====
│   │   ├── 📄 package.json
│   │   ├── 📄 next.config.js
│   │   ├── 📄 tailwind.config.ts
│   │   ├── 📄 tsconfig.json
│   │   ├── 📁 public/
│   │   │   ├── 📁 fonts/
│   │   │   └── 📁 images/
│   │   └── 📁 src/
│   │       ├── 📁 app/              # Next.js App Router
│   │       │   ├── 📄 layout.tsx    # Root layout
│   │       │   ├── 📄 page.tsx      # Landing / Dashboard
│   │       │   ├── 📁 classrooms/
│   │       │   │   ├── 📄 page.tsx           # Danh sách lớp
│   │       │   │   ├── 📁 [id]/
│   │       │   │   │   ├── 📄 page.tsx       # Chi tiết lớp
│   │       │   │   │   └── 📁 students/
│   │       │   │   │       └── 📄 page.tsx   # Quản lý học sinh
│   │       │   │   └── 📁 create/
│   │       │   │       └── 📄 page.tsx       # Tạo lớp mới
│   │       │   ├── 📁 quizzes/
│   │       │   │   ├── 📄 page.tsx           # Danh sách đề
│   │       │   │   ├── 📁 [id]/
│   │       │   │   │   ├── 📄 page.tsx       # Chi tiết đề / Sửa câu hỏi
│   │       │   │   │   └── 📁 edit/
│   │       │   │   │       └── 📄 page.tsx   # Editor câu hỏi
│   │       │   │   └── 📁 create/
│   │       │   │       └── 📄 page.tsx       # Tạo đề mới
│   │       │   ├── 📁 sessions/
│   │       │   │   ├── 📄 page.tsx           # Danh sách phiên
│   │       │   │   ├── 📁 [id]/
│   │       │   │   │   └── 📄 page.tsx       # Điều khiển phiên
│   │       │   │   ├── 📁 create/
│   │       │   │   │   └── 📄 page.tsx       # Tạo phiên mới
│   │       │   │   └── 📁 projector/
│   │       │   │       └── 📁 [id]/
│   │       │   │           └── 📄 page.tsx   # ★ MÀN HÌNH MÁY CHIẾU ★
│   │       │   └── 📁 results/
│   │       │       └── 📁 [sessionId]/
│   │       │           └── 📄 page.tsx       # Bảng kết quả + xuất Excel
│   │       ├── 📁 components/
│   │       │   ├── 📁 ui/                    # Components UI cơ bản
│   │       │   │   ├── 📄 Button.tsx
│   │       │   │   ├── 📄 Input.tsx
│   │       │   │   ├── 📄 Card.tsx
│   │       │   │   ├── 📄 Modal.tsx
│   │       │   │   ├── 📄 Select.tsx
│   │       │   │   ├── 📄 Badge.tsx
│   │       │   │   └── 📄 Toast.tsx
│   │       │   ├── 📁 classroom/
│   │       │   │   ├── 📄 ClassroomCard.tsx
│   │       │   │   ├── 📄 StudentList.tsx
│   │       │   │   └── 📄 StudentImport.tsx  # Paste từ Excel
│   │       │   ├── 📁 quiz/
│   │       │   │   ├── 📄 QuizCard.tsx
│   │       │   │   ├── 📄 QuestionEditor.tsx
│   │       │   │   └── 📄 QuestionPreview.tsx
│   │       │   ├── 📁 session/
│   │       │   │   ├── 📄 SessionControl.tsx
│   │       │   │   └── 📄 SessionStatus.tsx
│   │       │   ├── 📁 projector/             # ★ COMPONENTS MÁY CHIẾU ★
│   │       │   │   ├── 📄 ProjectorView.tsx
│   │       │   │   ├── 📄 CountdownTimer.tsx
│   │       │   │   ├── 📄 StudentGrid.tsx
│   │       │   │   ├── 📄 AnswerOptions.tsx
│   │       │   │   ├── 📄 ResultChart.tsx
│   │       │   │   └── 📄 QuestionHeader.tsx
│   │       │   ├── 📁 results/
│   │       │   │   ├── 📄 ScoreTable.tsx
│   │       │   │   └── 📄 BarChart.tsx
│   │       │   └── 📁 layout/
│   │       │       ├── 📄 Sidebar.tsx
│   │       │       ├── 📄 Navbar.tsx
│   │       │       └── 📄 Footer.tsx
│   │       ├── 📁 hooks/
│   │       │   ├── 📄 useSocket.ts           # Hook kết nối Socket.io
│   │       │   ├── 📄 useTimer.ts            # Hook countdown
│   │       │   └── 📄 useApi.ts              # Hook gọi REST API
│   │       ├── 📁 lib/
│   │       │   ├── 📄 socket.ts              # Socket.io client instance
│   │       │   ├── 📄 api.ts                 # Axios/fetch wrapper
│   │       │   └── 📄 utils.ts               # Helper functions
│   │       └── 📁 styles/
│   │           └── 📄 globals.css            # Tailwind + custom styles
│   │
│   └── 📁 mobile/                   # ===== MOBILE APP (FLUTTER) =====
│       ├── 📄 pubspec.yaml
│       ├── 📁 lib/
│       │   ├── 📄 main.dart
│       │   ├── 📁 screens/
│       │   │   ├── 📄 home_screen.dart       # Chọn phiên
│       │   │   ├── 📄 scanner_screen.dart    # ★ MÀN HÌNH QUÉT CHÍNH ★
│       │   │   └── 📄 settings_screen.dart   # Cấu hình server URL
│       │   ├── 📁 services/
│       │   │   ├── 📄 socket_service.dart    # Kết nối Socket.io
│       │   │   └── 📄 aruco_service.dart     # Xử lý OpenCV
│       │   ├── 📁 models/
│       │   │   ├── 📄 scan_result.dart
│       │   │   └── 📄 session.dart
│       │   ├── 📁 widgets/
│       │   │   ├── 📄 camera_overlay.dart    # Bounding box overlay
│       │   │   ├── 📄 scan_status_bar.dart   # Bottom bar trạng thái
│       │   │   └── 📄 control_buttons.dart   # Nút điều khiển
│       │   └── 📁 utils/
│       │       └── 📄 angle_calculator.dart  # Tính góc xoay → đáp án
│       ├── 📁 android/
│       ├── 📁 ios/
│       └── 📁 assets/
│           └── 📁 aruco_dict/                # Dictionary data nếu cần
│
├── 📁 scripts/                      # ===== UTILITY SCRIPTS =====
│   ├── 📄 generate-aruco-cards.py   # Sinh PDF 50 thẻ ArUco
│   ├── 📄 seed-database.ts          # Seed dữ liệu test
│   └── 📄 test-camera.py            # Test nhận diện camera
│
└── 📁 docs/                         # ===== TÀI LIỆU =====
    ├── 📄 API.md                     # API documentation
    ├── 📄 DEPLOYMENT.md              # Hướng dẫn deploy
    ├── 📄 CARD-PRINTING.md           # Hướng dẫn in thẻ
    └── 📁 wireframes/               # Mockup hình ảnh
```

---

## 3. HƯỚNG DẪN SETUP MÔI TRƯỜNG DEV TỪ A-Z

### 3.1. Yêu cầu phần mềm cài trước

| Phần mềm | Phiên bản tối thiểu | Cài đặt |
| :--- | :--- | :--- |
| **Node.js** | 20 LTS | https://nodejs.org hoặc `nvm install 20` |
| **npm** | 10+ | Đi kèm Node.js |
| **Git** | 2.x | https://git-scm.com |
| **Flutter SDK** | 3.19+ | https://flutter.dev/docs/get-started/install |
| **Android Studio** | Hedgehog+ | Cần cho Android emulator + SDK |
| **Xcode** (macOS) | 15+ | Chỉ cần nếu build iOS |
| **Python** | 3.10+ | Chỉ cần cho script sinh thẻ ArUco |
| **VS Code** | Latest | Khuyến nghị IDE chính |

### 3.2. VS Code Extensions khuyến nghị

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dart-code.dart-code",
    "dart-code.flutter",
    "prisma.prisma",
    "ms-python.python"
  ]
}
```

### 3.3. Khởi tạo dự án từ đầu (Step by step)

#### Bước 1: Tạo thư mục gốc & khởi tạo workspace

```bash
mkdir pickball && cd pickball
git init

# Tạo package.json gốc cho npm workspaces
npm init -y
```

Sửa `package.json` gốc:

```json
{
  "name": "pickball-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:web\"",
    "dev:server": "npm -w apps/server run dev",
    "dev:web": "npm -w apps/web run dev",
    "build": "npm -w apps/server run build && npm -w apps/web run build",
    "seed": "npx tsx scripts/seed-database.ts",
    "generate:cards": "python scripts/generate-aruco-cards.py"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "typescript": "^5.3.0"
  }
}
```

#### Bước 2: Tạo shared package

```bash
mkdir -p packages/shared/src
cd packages/shared
npm init -y
```

`packages/shared/src/types.ts`:
```typescript
// ===== DATABASE MODELS =====
export interface Classroom {
  id: string;
  name: string;
  created_at: string;
}

export interface Student {
  id: string;
  classroom_id: string;
  card_id: number;       // 1-50, tương ứng mã ArUco
  full_name: string;
}

export interface Quiz {
  id: string;
  title: string;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_order: number;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  time_limit: number;    // giây
}

export interface ExamSession {
  id: string;
  classroom_id: string;
  quiz_id: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  created_at: string;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  student_id: string;
  selected_option: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean;
  submitted_at: string;
}

// ===== SOCKET EVENTS PAYLOAD =====
export interface ScanRecord {
  cardId: number;
  answer: 'A' | 'B' | 'C' | 'D';
}

export interface QuestionStartedPayload {
  questionId: string;
  questionOrder: number;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  timeLimit: number;
  totalQuestions: number;
}

export interface SubmitScannedBatchPayload {
  sessionId: string;
  questionId: string;
  records: ScanRecord[];
}

export interface UpdateSubmittedPayload {
  submittedCardIds: number[];
  totalStudents: number;
}

export interface QuestionLockedPayload {
  correctOption: 'A' | 'B' | 'C' | 'D';
  answerDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  finalAnswers: Record<number, string>; // cardId -> answer
}
```

`packages/shared/src/constants.ts`:
```typescript
// Socket.io event names — dùng chung giữa client/server/mobile
export const SOCKET_EVENTS = {
  // Connection
  JOIN_AS_PROJECTOR: 'join_as_projector',
  JOIN_AS_SCANNER: 'join_as_scanner',

  // Session control (Teacher → All)
  START_SESSION: 'start_session',
  NEXT_QUESTION: 'next_question',
  LOCK_QUESTION: 'lock_question',
  END_SESSION: 'end_session',

  // Question flow (Server → All)
  QUESTION_STARTED: 'question_started',
  QUESTION_LOCKED: 'question_locked',
  SESSION_ENDED: 'session_ended',

  // Scanning (Mobile → Server → Projector)
  SUBMIT_SCANNED_BATCH: 'submit_scanned_batch',
  UPDATE_SUBMITTED_STUDENTS: 'update_submitted_students',

  // Errors
  ERROR: 'error',
} as const;

export const ANSWER_OPTIONS = ['A', 'B', 'C', 'D'] as const;
export const MAX_CARDS = 50;
export const DEFAULT_TIME_LIMIT = 30; // giây
```

#### Bước 3: Tạo Backend Server

```bash
mkdir -p apps/server/src/{routes,socket,services,utils}
mkdir -p apps/server/data
cd apps/server
npm init -y
```

Cài dependencies cho server:

```bash
# Trong thư mục apps/server
npm install express socket.io better-sqlite3 cors uuid exceljs
npm install -D typescript @types/express @types/better-sqlite3 @types/cors @types/uuid tsx nodemon
```

`apps/server/package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

#### Bước 4: Tạo Web App (Next.js)

```bash
cd apps/
npx -y create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Cài thêm dependencies cho web:

```bash
cd apps/web
npm install socket.io-client axios react-icons recharts
npm install -D @types/node
```

#### Bước 5: Tạo Mobile App (Flutter)

```bash
cd apps/
flutter create --org com.pickball mobile
cd mobile
flutter pub add camera opencv_dart socket_io_client provider
```

#### Bước 6: Cài Python cho script sinh thẻ

```bash
pip install opencv-python numpy reportlab
```

### 3.4. Chạy dự án trong chế độ Development

```bash
# Terminal 1 — Chạy Backend Server (port 3001)
cd pickball
npm run dev:server
# → Server running at http://localhost:3001
# → SQLite database created at apps/server/data/pickball.db

# Terminal 2 — Chạy Web App (port 3000)
npm run dev:web
# → Web app running at http://localhost:3000

# Terminal 3 — Chạy Mobile App
cd apps/mobile
flutter run
# → Chọn thiết bị Android/iOS emulator hoặc kết nối thiết bị thật

# HOẶC chạy tất cả Web + Server cùng lúc:
npm run dev
```

### 3.5. Biến môi trường (.env)

`.env.example`:
```env
# === SERVER ===
PORT=3001
DATABASE_PATH=./data/pickball.db
CORS_ORIGIN=http://localhost:3000

# === WEB APP ===
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# === MOBILE (trong code Flutter) ===
# Sửa trực tiếp trong settings_screen.dart hoặc .env mobile
# SERVER_URL=http://<LAN_IP>:3001
```

> **⚠️ Lưu ý Mobile:** Khi chạy trên thiết bị thật hoặc emulator, cần dùng IP LAN thay vì `localhost`. Ví dụ: `http://192.168.1.100:3001`

---

## 4. KIẾN TRÚC CƠ SỞ DỮ LIỆU (SQLITE)

### 4.1. Schema Definition

```sql
-- File: apps/server/src/database.ts (sẽ chạy khi khởi tạo)

-- 1. Bảng Lớp học
CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,                         -- UUID dạng text
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Bảng Học sinh
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL,                    -- Số thứ tự in trên thẻ ArUco (1-50)
    full_name TEXT NOT NULL,
    UNIQUE(classroom_id, card_id)                -- Mỗi lớp không trùng card_id
);

-- 3. Bảng Bộ câu hỏi (Quiz)
CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Bảng Câu hỏi (không giới hạn số lượng)
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    content TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT CHECK (correct_option IN ('A', 'B', 'C', 'D')) NOT NULL,
    time_limit INTEGER DEFAULT 30
);

-- 5. Bảng Phiên kiểm tra
CREATE TABLE IF NOT EXISTS exam_sessions (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL REFERENCES classrooms(id),
    quiz_id TEXT NOT NULL REFERENCES quizzes(id),
    status TEXT DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ACTIVE', 'COMPLETED')),
    current_question_order INTEGER DEFAULT 0,    -- Theo dõi câu hỏi hiện tại
    created_at TEXT DEFAULT (datetime('now'))
);

-- 6. Bảng Kết quả từng câu
CREATE TABLE IF NOT EXISTS session_answers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id),
    student_id TEXT NOT NULL REFERENCES students(id),
    selected_option TEXT CHECK (selected_option IN ('A', 'B', 'C', 'D')) NOT NULL,
    is_correct INTEGER NOT NULL,                 -- SQLite dùng 0/1 thay boolean
    submitted_at TEXT DEFAULT (datetime('now')),
    UNIQUE(session_id, question_id, student_id)  -- Mỗi HS chỉ nộp 1 đáp án / câu
);

-- Index cho query nhanh
CREATE INDEX IF NOT EXISTS idx_students_classroom ON students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_answers_session ON session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON session_answers(question_id);
```

### 4.2. Sơ đồ quan hệ (ERD)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│  classrooms  │       │   quizzes    │       │  exam_sessions   │
│──────────────│       │──────────────│       │──────────────────│
│ id (PK)      │◄──┐   │ id (PK)      │◄──┐   │ id (PK)          │
│ name         │   │   │ title        │   │   │ classroom_id (FK)│──┐
│ created_at   │   │   │ created_at   │   │   │ quiz_id (FK)     │──┤
└──────────────┘   │   └──────────────┘   │   │ status           │  │
       │           │          │            │   │ current_q_order  │  │
       │ 1:N       │          │ 1:N        │   │ created_at       │  │
       ▼           │          ▼            │   └──────────────────┘  │
┌──────────────┐   │   ┌──────────────┐   │          │              │
│   students   │   │   │  questions   │   │          │ 1:N          │
│──────────────│   │   │──────────────│   │          ▼              │
│ id (PK)      │   │   │ id (PK)      │   │   ┌──────────────────┐ │
│ classroom_id │───┘   │ quiz_id (FK) │───┘   │ session_answers  │ │
│ card_id      │       │ question_ord │       │──────────────────│ │
│ full_name    │       │ content      │       │ id (PK)          │ │
└──────────────┘       │ option_a-d   │       │ session_id (FK)  │─┘
       │               │ correct_opt  │       │ question_id (FK) │
       │               │ time_limit   │       │ student_id (FK)  │
       │               └──────────────┘       │ selected_option  │
       │                      │               │ is_correct       │
       └──────────────────────┼───────────────│ submitted_at     │
                              │               └──────────────────┘
                              │                       ▲
                              └───────────────────────┘
```

---

## 5. API ENDPOINTS CHI TIẾT (REST + WEBSOCKET)

### 5.1. REST API Endpoints

Base URL: `http://localhost:3001/api`

#### 📚 Classrooms — Quản lý Lớp học

| Method | Endpoint | Body / Params | Response | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/classrooms` | — | `Classroom[]` | Lấy danh sách tất cả lớp |
| `GET` | `/classrooms/:id` | — | `Classroom & { students: Student[] }` | Chi tiết lớp + danh sách HS |
| `POST` | `/classrooms` | `{ name: string }` | `Classroom` | Tạo lớp mới |
| `PUT` | `/classrooms/:id` | `{ name: string }` | `Classroom` | Đổi tên lớp |
| `DELETE` | `/classrooms/:id` | — | `{ success: true }` | Xóa lớp (cascade xóa HS) |

#### 👨‍🎓 Students — Quản lý Học sinh

| Method | Endpoint | Body / Params | Response | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/classrooms/:classId/students` | — | `Student[]` | Danh sách HS của lớp |
| `POST` | `/classrooms/:classId/students` | `{ full_name, card_id }` | `Student` | Thêm 1 HS |
| `POST` | `/classrooms/:classId/students/bulk` | `{ students: [{full_name}] }` | `Student[]` | Import hàng loạt (auto-assign card_id) |
| `PUT` | `/students/:id` | `{ full_name?, card_id? }` | `Student` | Cập nhật HS |
| `DELETE` | `/students/:id` | — | `{ success: true }` | Xóa HS |

#### 📝 Quizzes — Quản lý Đề kiểm tra

| Method | Endpoint | Body / Params | Response | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/quizzes` | — | `Quiz[]` | Danh sách đề |
| `GET` | `/quizzes/:id` | — | `Quiz & { questions: Question[] }` | Chi tiết đề + câu hỏi |
| `POST` | `/quizzes` | `{ title }` | `Quiz` | Tạo đề mới |
| `PUT` | `/quizzes/:id` | `{ title }` | `Quiz` | Sửa tiêu đề đề |
| `DELETE` | `/quizzes/:id` | — | `{ success: true }` | Xóa đề (cascade) |

#### ❓ Questions — Quản lý Câu hỏi

| Method | Endpoint | Body / Params | Response | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/quizzes/:quizId/questions` | — | `Question[]` | Danh sách câu hỏi |
| `POST` | `/quizzes/:quizId/questions` | `{ content, option_a, ..., correct_option, time_limit? }` | `Question` | Thêm câu hỏi |
| `PUT` | `/questions/:id` | `{ content?, option_a?, ... }` | `Question` | Sửa câu hỏi |
| `DELETE` | `/questions/:id` | — | `{ success: true }` | Xóa câu hỏi |
| `PUT` | `/quizzes/:quizId/questions/reorder` | `{ orderedIds: string[] }` | `{ success: true }` | Sắp xếp lại thứ tự |

#### 🎯 Exam Sessions — Quản lý Phiên kiểm tra

| Method | Endpoint | Body / Params | Response | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sessions` | `?status=ACTIVE` | `ExamSession[]` | Danh sách phiên |
| `GET` | `/sessions/:id` | — | `ExamSession & { classroom, quiz }` | Chi tiết phiên |
| `POST` | `/sessions` | `{ classroom_id, quiz_id }` | `ExamSession` | Tạo phiên mới |
| `PATCH` | `/sessions/:id/status` | `{ status: 'COMPLETED' }` | `ExamSession` | Kết thúc phiên |

#### 📊 Results — Kết quả & Xuất dữ liệu

| Method | Endpoint | Body / Params | Response | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sessions/:id/results` | — | `{ students: [...], summary: {...} }` | Bảng điểm chi tiết |
| `GET` | `/sessions/:id/results/export` | `?format=xlsx` | File download (.xlsx) | Xuất bảng điểm Excel |
| `GET` | `/sessions/:id/results/export` | `?format=csv` | File download (.csv) | Xuất bảng điểm CSV |

#### 🎴 Utilities

| Method | Endpoint | Params | Response | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/cards/pdf` | `?count=50&size=A5` | File download (.pdf) | Tải PDF thẻ ArUco |

### 5.2. WebSocket Events (Socket.io)

Namespace: `/` (default)  
URL: `ws://localhost:3001`

#### Events từ Client → Server

| Event Name | Payload | Ai gửi | Mô tả |
| :--- | :--- | :--- | :--- |
| `join_as_projector` | `{ sessionId: string }` | Web App | Máy chiếu tham gia room |
| `join_as_scanner` | `{ sessionId: string }` | Mobile App | Scanner tham gia room |
| `next_question` | `{ sessionId, questionId, timeLimit }` | Web/Mobile | Chuyển câu hỏi tiếp |
| `submit_scanned_batch` | `{ sessionId, questionId, records: [{cardId, answer}] }` | Mobile | Gửi batch kết quả quét |
| `lock_question` | `{ sessionId }` | Web/Mobile | Khóa câu hỏi (GV ấn hoặc hết giờ) |
| `end_session` | `{ sessionId }` | Web/Mobile | Kết thúc phiên |

#### Events từ Server → Client

| Event Name | Payload | Ai nhận | Mô tả |
| :--- | :--- | :--- | :--- |
| `question_started` | `QuestionStartedPayload` | All in room | Câu hỏi mới bắt đầu |
| `update_submitted_students` | `UpdateSubmittedPayload` | Projector | Cập nhật danh sách đã nộp |
| `question_locked` | `QuestionLockedPayload` | All in room | Hết giờ / khóa câu hỏi |
| `session_ended` | `{ sessionId }` | All in room | Phiên kết thúc |
| `error` | `{ message: string }` | Sender | Lỗi |

#### Luồng hoạt động WebSocket

```
┌────────────┐      ┌────────────┐      ┌────────────────┐
│  Mobile    │      │   Server   │      │  Web Projector  │
│  Scanner   │      │  Socket.io │      │                 │
└─────┬──────┘      └─────┬──────┘      └───────┬─────────┘
      │                   │                     │
      │  join_as_scanner  │  join_as_projector  │
      │──────────────────>│<────────────────────│
      │                   │                     │
      │                   │   GV bấm "Bắt đầu" │
      │                   │<────────────────────│
      │                   │     next_question   │
      │  question_started │                     │
      │<──────────────────│─────────────────────>│  question_started
      │                   │                     │
      │  [Quét thẻ liên tục]                    │
      │  submit_scanned_  │                     │
      │  batch            │                     │
      │──────────────────>│                     │
      │                   │  update_submitted_  │
      │                   │  students           │
      │                   │─────────────────────>│  (Grid cập nhật)
      │                   │                     │
      │  ... (quét tiếp)  │                     │
      │──────────────────>│─────────────────────>│
      │                   │                     │
      │                   │  Timer hết giờ HOẶC │
      │                   │  GV bấm "Khóa"     │
      │                   │<────────────────────│
      │                   │     lock_question   │
      │  question_locked  │                     │
      │<──────────────────│─────────────────────>│  question_locked
      │                   │                     │  (Hiện đáp án đúng
      │                   │                     │   + biểu đồ)
      │                   │                     │
      │                   │  GV bấm "Câu tiếp" │
      │                   │<────────────────────│
      │                   │     next_question   │
      │  question_started │                     │
      │<──────────────────│─────────────────────>│  (Lặp lại)
      ▼                   ▼                     ▼
```

---

## 6. THIẾT KẾ GIAO DIỆN & WIREFRAME CHI TIẾT

### 6.1. Hệ thống thiết kế (Design System)

#### Color Palette

```css
:root {
  /* Primary — Xanh dương đậm (chuyên nghiệp, giáo dục) */
  --primary-50:  #EFF6FF;
  --primary-100: #DBEAFE;
  --primary-500: #3B82F6;
  --primary-600: #2563EB;
  --primary-700: #1D4ED8;
  --primary-900: #1E3A5F;

  /* Success — Xanh lá (đúng) */
  --success-400: #4ADE80;
  --success-500: #22C55E;
  --success-600: #16A34A;

  /* Danger — Đỏ (sai / hết giờ) */
  --danger-400: #F87171;
  --danger-500: #EF4444;
  --danger-600: #DC2626;

  /* Warning — Vàng cam */
  --warning-400: #FBBF24;
  --warning-500: #F59E0B;

  /* Neutral — Slate */
  --slate-50:  #F8FAFC;
  --slate-100: #F1F5F9;
  --slate-200: #E2E8F0;
  --slate-300: #CBD5E1;
  --slate-700: #334155;
  --slate-800: #1E293B;
  --slate-900: #0F172A;
  --slate-950: #020617;

  /* Đáp án ABCD — 4 màu tương phản rõ */
  --answer-a: #3B82F6;  /* Xanh dương */
  --answer-b: #F59E0B;  /* Vàng cam */
  --answer-c: #EF4444;  /* Đỏ */
  --answer-d: #22C55E;  /* Xanh lá */
}
```

#### Typography

```css
/* Google Font: Inter (chính) + JetBrains Mono (code/số) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

body {
  font-family: 'Inter', -apple-system, sans-serif;
}

.font-mono {
  font-family: 'JetBrains Mono', monospace;
}
```

---

### 6.2. Wireframe — Màn hình Dashboard chính (Web)

**URL:** `/` — Trang chủ sau khi mở Web App

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                        🔔  ⚙️  👤 Admin │
│ │  🎯 Logo │  Dashboard    Lớp học    Đề kiểm tra    Phiên thi    Kết quả           │
│ │ PickBall │  ═══════                                                                │
│ └──────────┘                                                                         │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Xin chào! 👋 Hãy bắt đầu quản lý lớp học                                          │
│                                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  📚              │  │  📝              │  │  🎯              │  │  📊              │  │
│  │  3               │  │  5               │  │  1               │  │  87%             │  │
│  │  Lớp học         │  │  Bộ đề           │  │  Phiên đang chạy │  │  Tỷ lệ đúng TB  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                                       │
│  ╔══════════════════════════════════════════════════════════════════════════════════╗  │
│  ║  🚀 HÀNH ĐỘNG NHANH                                                            ║  │
│  ║                                                                                  ║  │
│  ║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐               ║  │
│  ║  │  + Tạo lớp mới   │  │  + Soạn đề mới   │  │  ▶ Bắt đầu thi  │               ║  │
│  ║  │    (Import HS)    │  │    (Trắc nghiệm) │  │    (Chọn lớp+đề) │               ║  │
│  ║  └──────────────────┘  └──────────────────┘  └──────────────────┘               ║  │
│  ╚══════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                       │
│  PHIÊN THI GẦN ĐÂY                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Lớp 10A1 — Kiểm tra Toán chương 3     │  25/42 đúng  │ 12:30 02/11  │  ✅    │  │
│  │  Lớp 10A2 — Kiểm tra Lý bài 5          │  30/38 đúng  │ 09:15 01/11  │  ✅    │  │
│  │  Lớp 11B3 — Ôn tập Hóa                 │  ─ đang chạy │  ─           │  🔴    │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.3. Wireframe — Tạo lớp & Import học sinh (Web)

**URL:** `/classrooms/create`

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  ← Quay lại    TẠO LỚP HỌC MỚI                                                     │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Tên lớp: ┌─────────────────────────────────────────┐                                │
│           │ Lớp 10A1 - Trường THPT ABC              │                                │
│           └─────────────────────────────────────────┘                                │
│                                                                                       │
│  ┌────────────────────────────────────────┐  ┌────────────────────────────────────┐   │
│  │  📋 DÁN DANH SÁCH HỌC SINH             │  │  👁️ XEM TRƯỚC                       │   │
│  │  (Copy từ Excel, mỗi tên 1 dòng)       │  │                                    │   │
│  │ ┌────────────────────────────────────┐  │  │  Thẻ #01  │ Nguyễn Văn An         │   │
│  │ │ Nguyễn Văn An                     │  │  │  Thẻ #02  │ Trần Thị Bình         │   │
│  │ │ Trần Thị Bình                     │  │  │  Thẻ #03  │ Lê Hoàng Cường        │   │
│  │ │ Lê Hoàng Cường                    │  │  │  Thẻ #04  │ Phạm Minh Đức         │   │
│  │ │ Phạm Minh Đức                     │  │  │  Thẻ #05  │ Hoàng Thu Hà          │   │
│  │ │ Hoàng Thu Hà                      │  │  │  ...                               │   │
│  │ │ ...                               │  │  │                                    │   │
│  │ │                                   │  │  │  Tổng: 42 học sinh                 │   │
│  │ │                                   │  │  │  Card ID: 1 → 42                   │   │
│  │ └────────────────────────────────────┘  │  │                                    │   │
│  │                                         │  │  ⚠️ Card #43-50 chưa gán           │   │
│  │  Phân cách bởi: ○ Xuống dòng  ○ Tab    │  │                                    │   │
│  └────────────────────────────────────────┘  └────────────────────────────────────┘   │
│                                                                                       │
│  ┌───────────────────────────┐  ┌────────────────────────────┐                       │
│  │  💾 Lưu lớp học            │  │  🎴 Tải bộ thẻ ArUco (PDF) │                       │
│  │  (primary button)          │  │  (secondary button)         │                       │
│  └───────────────────────────┘  └────────────────────────────┘                       │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

**Chức năng chi tiết:**
1. **Textarea paste:** Giáo viên copy cột "Họ và tên" từ file Excel → paste vào textarea
2. **Auto-parse:** Tự động tách dòng, loại bỏ dòng trống, trim khoảng trắng
3. **Auto card_id:** Gán tuần tự card_id từ 1 → N theo thứ tự danh sách
4. **Preview realtime:** Panel bên phải hiển thị xem trước ngay khi paste
5. **Download PDF:** Sinh file PDF chứa 50 thẻ ArUco đã đánh số, sẵn sàng in

---

### 6.4. Wireframe — Soạn đề & Cài đặt thời gian (Web)

**URL:** `/quizzes/[id]/edit`

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  ← Quay lại    SOẠN ĐỀ: Kiểm tra Toán Chương 3                   [Lưu] [Xem trước]│
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─ CÂU 1 ──────────────────────────────────────────────────────────────── ⏱️ 30s ─┐ │
│  │                                                                                   │ │
│  │  Nội dung câu hỏi:                                                               │ │
│  │  ┌──────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Phương trình x² - 5x + 6 = 0 có nghiệm là:                               │ │ │
│  │  └──────────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                                   │ │
│  │  ┌───────── A ──────────┐  ┌───────── B ──────────┐                              │ │
│  │  │ x = 1 và x = 6      │  │ x = 2 và x = 3  ✅   │  ← Click chọn đáp án đúng  │ │
│  │  └──────────────────────┘  └──────────────────────┘                              │ │
│  │  ┌───────── C ──────────┐  ┌───────── D ──────────┐                              │ │
│  │  │ x = -2 và x = -3    │  │ x = 1 và x = -6     │                              │ │
│  │  └──────────────────────┘  └──────────────────────┘                              │ │
│  │                                                                                   │ │
│  │  Thời gian: [──●────────] 30 giây     🗑️ Xóa câu    ↕️ Kéo thả sắp xếp         │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
│  ┌─ CÂU 2 ──────────────────────────────────────────────────────────────── ⏱️ 45s ─┐ │
│  │  Nội dung: Tính giá trị biểu thức sin²(30°) + cos²(30°)                         │ │
│  │  A: 0          B: 1 ✅        C: 2          D: √3                                │ │
│  │  Thời gian: [────●──────] 45 giây                                                │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
│  ┌─ CÂU 3... ───────────────────────────────────────────────────────────────────────┐ │
│  │  ...                                                                              │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
│  ┌──────────────────────────────────────────────────┐                                │
│  │  ＋ THÊM CÂU HỎI MỚI                             │                                │
│  └──────────────────────────────────────────────────┘                                │
│                                                                                       │
│  ┌────────────────────┐  ┌──────────────────────┐  ┌───────────────────────┐         │
│  │ 💾 Lưu đề           │  │ 📄 Xuất đáp án (PDF) │  │ 📊 Xuất đáp án (XLSX)│         │
│  └────────────────────┘  └──────────────────────┘  └───────────────────────┘         │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

**Chức năng chi tiết:**
1. **Unlimited questions:** Không giới hạn số câu, cuộn mượt
2. **Inline editing:** Click vào text để sửa trực tiếp, auto-save
3. **Correct answer toggle:** Click vào ô A/B/C/D để đánh dấu đáp án đúng (ô sáng lên xanh ✅)
4. **Time slider:** Thanh trượt 10s → 120s, mặc định 30s
5. **Drag & drop reorder:** Kéo thả icon ↕️ để sắp xếp lại thứ tự câu
6. **Export:** Xuất file đáp án để in ra giấy (backup cho giáo viên)

---

### 6.5. Wireframe — Bắt đầu phiên thi (Web)

**URL:** `/sessions/create`

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  ← Quay lại    TẠO PHIÊN THI MỚI                                                    │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  1️⃣  CHỌN LỚP HỌC                                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐                 │
│  │  ▼  Lớp 10A1 (42 học sinh)                                     │                 │
│  │     Lớp 10A2 (38 học sinh)                                     │                 │
│  │     Lớp 11B3 (45 học sinh)                                     │                 │
│  └──────────────────────────────────────────────────────────────────┘                 │
│                                                                                       │
│  2️⃣  CHỌN BỘ ĐỀ                                                                     │
│  ┌──────────────────────────────────────────────────────────────────┐                 │
│  │  ▼  Kiểm tra Toán Chương 3 (20 câu)                            │                 │
│  │     Kiểm tra Lý Bài 5 (15 câu)                                 │                 │
│  │     Ôn tập Hóa (30 câu)                                        │                 │
│  └──────────────────────────────────────────────────────────────────┘                 │
│                                                                                       │
│  3️⃣  TÓM TẮT                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐                 │
│  │  Lớp:     Lớp 10A1                                              │                 │
│  │  Đề:      Kiểm tra Toán Chương 3                                │                 │
│  │  Số câu:  20 câu                                                │                 │
│  │  Số HS:   42 học sinh                                           │                 │
│  │  Tổng TG: ~10 phút (trung bình 30s/câu)                        │                 │
│  └──────────────────────────────────────────────────────────────────┘                 │
│                                                                                       │
│  ┌───────────────────────────────────────────┐                                       │
│  │  🚀 BẮT ĐẦU PHIÊN THI                     │  ← Primary button lớn               │
│  └───────────────────────────────────────────┘                                       │
│                                                                                       │
│  💡 Sau khi bấm, mở tab mới → Fullscreen máy chiếu tự động                          │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.6. Wireframe — ★ MÀN HÌNH MÁY CHIẾU (Projector Fullscreen View) ★

**URL:** `/sessions/projector/[id]` — Mở fullscreen trên máy chiếu

#### Trạng thái 1: Đang trả lời (Active)

```
┌═══════════════════════════════════════════════════════════════════════════════════════┐
║                                                                                       ║
║   Câu 3 / 20                                              ┌──────────────┐           ║
║   ══════════════════════════════════════════                │              │           ║
║                                                            │     28       │           ║
║   ┌────────────────────────────────────────────────────┐   │    giây      │           ║
║   │                                                    │   │              │           ║
║   │  Phương trình x² - 5x + 6 = 0 có nghiệm là:      │   │   ╭────╮     │           ║
║   │                                                    │   │   │ ◕  │     │           ║
║   └────────────────────────────────────────────────────┘   │   ╰────╯     │           ║
║                                                            │  (progress)  │           ║
║   ┌─────────────────────────┐  ┌─────────────────────────┐ └──────────────┘           ║
║   │  🔵 A                    │  │  🟡 B                    │                           ║
║   │                          │  │                          │                           ║
║   │  x = 1 và x = 6         │  │  x = 2 và x = 3         │                           ║
║   │                          │  │                          │                           ║
║   └─────────────────────────┘  └─────────────────────────┘                           ║
║   ┌─────────────────────────┐  ┌─────────────────────────┐                           ║
║   │  🔴 C                    │  │  🟢 D                    │                           ║
║   │                          │  │                          │                           ║
║   │  x = -2 và x = -3       │  │  x = 1 và x = -6        │                           ║
║   │                          │  │                          │                           ║
║   └─────────────────────────┘  └─────────────────────────┘                           ║
║                                                                                       ║
║   TRẠNG THÁI NỘP BÀI: 28/42 học sinh                      ████████████░░░░ 67%      ║
║   ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐                                                   ║
║   │01│02│03│04│05│06│07│08│09│10│   🟦 = Đã nộp                                      ║
║   │🟦│⬜│🟦│🟦│⬜│🟦│🟦│🟦│⬜│🟦│   ⬜ = Chưa nộp                                      ║
║   ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤                                                   ║
║   │11│12│13│14│15│16│17│18│19│20│   (Ô chỉ hiện "đã nộp"                             ║
║   │🟦│🟦│⬜│🟦│🟦│⬜│🟦│🟦│🟦│🟦│    KHÔNG hiện đáp án                                ║
║   ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤    để tránh lộ bài)                                ║
║   │21│22│23│24│25│26│27│28│29│30│                                                     ║
║   │🟦│🟦│🟦│🟦│⬜│🟦│⬜│🟦│🟦│⬜│                                                     ║
║   ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤                                                   ║
║   │31│32│33│34│35│36│37│38│39│40│                                                     ║
║   │🟦│⬜│🟦│🟦│🟦│🟦│⬜│🟦│⬜│🟦│                                                     ║
║   ├──┼──┼──┤                                                                         ║
║   │41│42│  │                                                                         ║
║   │🟦│⬜│  │                                                                         ║
║   └──┴──┴──┘                                                                         ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

#### Trạng thái 2: Hết giờ — Hiện kết quả (Locked)

```
┌═══════════════════════════════════════════════════════════════════════════════════════┐
║                                                                                       ║
║   Câu 3 / 20                                              ┌──────────────┐           ║
║   ══════════════════════════════════════════                │   HẾT GIỜ!  │           ║
║                                                            │    0 giây    │           ║
║   ┌────────────────────────────────────────────────────┐   │   🔴🔴🔴     │           ║
║   │  Phương trình x² - 5x + 6 = 0 có nghiệm là:      │   └──────────────┘           ║
║   └────────────────────────────────────────────────────┘                              ║
║                                                                                       ║
║   ┌─────────────────────────┐  ┌═════════════════════════┐                           ║
║   │  🔵 A                    │  ║  🟡 B  ✅ ĐÁP ÁN ĐÚNG   ║  ← Viền xanh lá sáng    ║
║   │                          │  ║                          ║                           ║
║   │  x = 1 và x = 6         │  ║  x = 2 và x = 3         ║                           ║
║   │  ░░░░░ 12%              │  ║  ████████████████ 60%    ║                           ║
║   └─────────────────────────┘  ╚═════════════════════════╝                           ║
║   ┌─────────────────────────┐  ┌─────────────────────────┐                           ║
║   │  🔴 C                    │  │  🟢 D                    │                           ║
║   │                          │  │                          │                           ║
║   │  x = -2 và x = -3       │  │  x = 1 và x = -6        │                           ║
║   │  ░░░░░░░░ 18%           │  │  ░░░░░ 10%              │                           ║
║   └─────────────────────────┘  └─────────────────────────┘                           ║
║                                                                                       ║
║   📊 THỐNG KÊ                                                                        ║
║   ┌──────────────────────────────────────────────────┐                                ║
║   │  A ████░░░░░░░░░░░░░░░░░░░░░░░░░  12% (5 HS)    │                                ║
║   │  B ████████████████████████░░░░░░  60% (25 HS)   │  ← Đáp án đúng, xanh lá     ║
║   │  C █████████░░░░░░░░░░░░░░░░░░░░  18% (8 HS)    │                                ║
║   │  D ████░░░░░░░░░░░░░░░░░░░░░░░░░  10% (4 HS)    │                                ║
║   │                                                   │                                ║
║   │  Tổng đã nộp: 42/42   ✅ Đúng: 25   ❌ Sai: 17   │                                ║
║   └──────────────────────────────────────────────────┘                                ║
║                                                                                       ║
║                                    [  ▶ CÂU TIẾP THEO  ]                             ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

**Chức năng chi tiết của Projector View:**
1. **Countdown circle:** Đồng hồ tròn animation, khi < 5s → đỏ + nhấp nháy (pulse animation)
2. **4 khối đáp án:** Màu sắc khác nhau, font lớn, tương phản cao để nhìn từ xa
3. **Student grid:** Grid 10 cột, hiện số thẻ, realtime update khi quét được
4. **Khi hết giờ:** Tự động khóa, ô đáp án đúng sáng lên, hiện bar chart % A-B-C-D
5. **Nút "Câu tiếp theo":** Chỉ hiện sau khi hết giờ/khóa, click → emit `next_question`
6. **Fullscreen API:** Tự động request fullscreen khi mở, ấn `F11` hoặc `Esc` để thoát

---

### 6.7. Wireframe — Màn hình quét Camera (Mobile App)

```
┌─────────────────────────────────┐
│  ┌──── STATUS BAR ────────────┐ │
│  │  📶 WiFi   🔋 85%   11:30 │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    [LIVE CAMERA FEED]     │  │
│  │                           │  │
│  │   ┌─────────┐            │  │
│  │   │ ╔═══╗   │            │  │
│  │   │ ║   ║   │ #01 → A   │  │  ← Bounding box xanh
│  │   │ ╚═══╝   │            │  │    + nhãn nhỏ
│  │   └─────────┘            │  │
│  │                           │  │
│  │        ┌─────────┐       │  │
│  │        │ ╔═══╗   │       │  │
│  │        │ ║   ║   │#05→C  │  │
│  │        │ ╚═══╝   │       │  │
│  │        └─────────┘       │  │
│  │                           │  │
│  │  ┌─────────┐             │  │
│  │  │ ╔═══╗   │             │  │
│  │  │ ║   ║   │ #12 → B    │  │
│  │  │ ╚═══╝   │             │  │
│  │  └─────────┘             │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  📊 Câu 3/20   ⏱️ 28s     │  │  ← Info bar
│  │                           │  │
│  │  ✅ Đã quét: 28/42 HS    │  │  ← Đếm realtime
│  │  ████████████████░░░ 67%  │  │  ← Progress bar
│  │                           │  │
│  │ ┌───────────┐ ┌─────────┐│  │
│  │ │ 🔒 KHÓA   │ │ ▶ TIẾP  ││  │  ← Control buttons
│  │ │  CÂU HỎI  │ │ CÂU SAU ││  │
│  │ └───────────┘ └─────────┘│  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Chức năng chi tiết của Scanner:**
1. **Continuous scanning:** Camera luôn bật, quét liên tục 30 FPS
2. **Multi-marker detect:** Phát hiện nhiều thẻ cùng lúc trong 1 frame
3. **Bounding box overlay:** Vẽ hình chữ nhật quanh mỗi thẻ + hiện nhãn `#ID → Đáp án`
4. **Batch submit:** Gom kết quả quét mỗi 200ms gửi 1 batch qua WebSocket (giảm overhead)
5. **Deduplicate:** Chỉ gửi kết quả mới, bỏ qua thẻ đã quét
6. **Nút "Khóa câu hỏi":** Giáo viên chủ động khóa trước khi hết giờ
7. **Nút "Câu tiếp theo":** Chuyển câu, web auto update
8. **Vibration feedback:** Rung nhẹ khi quét thành công 1 thẻ mới

---

### 6.8. Wireframe — Bảng kết quả & Xuất điểm (Web)

**URL:** `/results/[sessionId]`

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  ← Quay lại    KẾT QUẢ PHIÊN THI                                                    │
│  Lớp 10A1 — Kiểm tra Toán Chương 3 — 02/11/2026                                    │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  📊 TỔNG QUAN                                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 42 HS    │  │ 15.2/20  │  │ 76%      │  │ 8.5      │  │ 7.2      │              │
│  │ tham gia │  │ Điểm TB  │  │ Tỷ lệ    │  │ Điểm cao │  │ Điểm thấp│              │
│  └──────────┘  └──────────┘  │ đúng TB  │  │ nhất     │  │ nhất     │              │
│                               └──────────┘  └──────────┘  └──────────┘              │
│                                                                                       │
│  📈 BIỂU ĐỒ PHÂN BỐ ĐIỂM                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐             │
│  │  12│                        ██                                      │             │
│  │  10│                   ██   ██                                      │             │
│  │   8│              ██   ██   ██   ██                                 │             │
│  │   6│         ██   ██   ██   ██   ██                                 │             │
│  │   4│    ██   ██   ██   ██   ██   ██   ██                            │             │
│  │   2│    ██   ██   ██   ██   ██   ██   ██   ██                       │             │
│  │   0├────┴────┴────┴────┴────┴────┴────┴────┴────                    │             │
│  │     0-1  2-3  4-5  6-7  8-9  10  11-12 13+    điểm                 │             │
│  └──────────────────────────────────────────────────────────────────────┘             │
│                                                                                       │
│  📋 BẢNG ĐIỂM CHI TIẾT                                                              │
│  ┌──────┬────────────────────┬──┬──┬──┬──┬──┬──┬──┬─────┬──────┬──────┐             │
│  │ Thẻ  │ Họ và tên          │C1│C2│C3│C4│C5│..│C20│Đúng │ Điểm │ Xếp  │             │
│  ├──────┼────────────────────┼──┼──┼──┼──┼──┼──┼───┼─────┼──────┼──────┤             │
│  │ #01  │ Nguyễn Văn An      │✅│✅│❌│✅│✅│..│✅ │18/20│ 9.0  │  2   │             │
│  │ #02  │ Trần Thị Bình      │✅│❌│✅│✅│❌│..│✅ │15/20│ 7.5  │  8   │             │
│  │ #03  │ Lê Hoàng Cường     │✅│✅│✅│✅│✅│..│✅ │20/20│ 10.0 │  1   │             │
│  │ ...  │ ...                │  │  │  │  │  │  │   │     │      │      │             │
│  └──────┴────────────────────┴──┴──┴──┴──┴──┴──┴───┴─────┴──────┴──────┘             │
│                                                                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐                                    │
│  │  📥 Xuất Excel (.xlsx)│  │  📥 Xuất CSV (.csv) │                                    │
│  └─────────────────────┘  └─────────────────────┘                                    │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. CHI TIẾT TRIỂN KHAI CODE CỐT LÕI

### 7.1. Database Setup (SQLite) — `apps/server/src/database.ts`

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/pickball.db');

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');       // Performance tốt hơn
    db.pragma('foreign_keys = ON');        // Bật foreign key constraint

    // Chạy migration
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      card_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      UNIQUE(classroom_id, card_id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_order INTEGER NOT NULL,
      content TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT CHECK (correct_option IN ('A','B','C','D')) NOT NULL,
      time_limit INTEGER DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS exam_sessions (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL REFERENCES classrooms(id),
      quiz_id TEXT NOT NULL REFERENCES quizzes(id),
      status TEXT DEFAULT 'WAITING' CHECK (status IN ('WAITING','ACTIVE','COMPLETED')),
      current_question_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      student_id TEXT NOT NULL REFERENCES students(id),
      selected_option TEXT CHECK (selected_option IN ('A','B','C','D')) NOT NULL,
      is_correct INTEGER NOT NULL,
      submitted_at TEXT DEFAULT (datetime('now')),
      UNIQUE(session_id, question_id, student_id)
    );

    CREATE INDEX IF NOT EXISTS idx_students_classroom ON students(classroom_id);
    CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_answers_session ON session_answers(session_id);
  `);

  console.log('✅ Database initialized at:', DB_PATH);
}
```

### 7.2. Backend Entry Point — `apps/server/src/index.ts`

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { getDB } from './database';
import { setupSocketHandlers } from './socket/sessionHandler';

// REST routes
import classroomRoutes from './routes/classrooms';
import studentRoutes from './routes/students';
import quizRoutes from './routes/quizzes';
import questionRoutes from './routes/questions';
import sessionRoutes from './routes/sessions';
import exportRoutes from './routes/export';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Khởi tạo database
getDB();

// REST API Routes
app.use('/api/classrooms', classroomRoutes);
app.use('/api', studentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api', questionRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
});
```

### 7.3. WebSocket Handler — `apps/server/src/socket/sessionHandler.ts`

```typescript
import { Server, Socket } from 'socket.io';
import { getDB } from '../database';
import { v4 as uuid } from 'uuid';
import { SOCKET_EVENTS } from '@pickball/shared/constants';

interface ActiveSession {
  sessionId: string;
  currentQuestionId: string | null;
  isLocked: boolean;
  answers: Record<number, string>;  // cardId → answer
  timeLimit: number;
}

const activeSessions: Map<string, ActiveSession> = new Map();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`📱 Client connected: ${socket.id}`);

    // === Tham gia room ===
    socket.on(SOCKET_EVENTS.JOIN_AS_PROJECTOR, ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      console.log(`🖥️  Projector joined session: ${sessionId}`);
    });

    socket.on(SOCKET_EVENTS.JOIN_AS_SCANNER, ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      console.log(`📷 Scanner joined session: ${sessionId}`);
    });

    // === Chuyển câu hỏi ===
    socket.on(SOCKET_EVENTS.NEXT_QUESTION, ({ sessionId, questionId, timeLimit }) => {
      const db = getDB();

      // Lấy thông tin câu hỏi từ DB
      const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId) as any;
      if (!question) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Question not found' });
        return;
      }

      // Cập nhật session state
      const session: ActiveSession = {
        sessionId,
        currentQuestionId: questionId,
        isLocked: false,
        answers: {},
        timeLimit: timeLimit || question.time_limit || 30,
      };
      activeSessions.set(sessionId, session);

      // Lấy tổng số câu hỏi
      const totalQ = db.prepare(
        'SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?'
      ).get(question.quiz_id) as any;

      // Broadcast đến tất cả trong room
      io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.QUESTION_STARTED, {
        questionId: question.id,
        questionOrder: question.question_order,
        content: question.content,
        optionA: question.option_a,
        optionB: question.option_b,
        optionC: question.option_c,
        optionD: question.option_d,
        timeLimit: session.timeLimit,
        totalQuestions: totalQ?.count || 0,
      });

      console.log(`▶️ Question started: ${question.question_order} in session ${sessionId}`);
    });

    // === Nhận kết quả quét ===
    socket.on(SOCKET_EVENTS.SUBMIT_SCANNED_BATCH, ({ sessionId, questionId, records }) => {
      const session = activeSessions.get(sessionId);
      if (!session || session.isLocked || session.currentQuestionId !== questionId) {
        return; // Bỏ qua nếu session không hợp lệ hoặc đã khóa
      }

      let hasNewAnswers = false;
      records.forEach(({ cardId, answer }: { cardId: number; answer: string }) => {
        if (!session.answers[cardId]) {
          session.answers[cardId] = answer;
          hasNewAnswers = true;
        }
      });

      if (hasNewAnswers) {
        // Lấy tổng số học sinh trong lớp
        const db = getDB();
        const examSession = db.prepare(
          'SELECT classroom_id FROM exam_sessions WHERE id = ?'
        ).get(sessionId) as any;
        const totalStudents = examSession
          ? (db.prepare(
              'SELECT COUNT(*) as count FROM students WHERE classroom_id = ?'
            ).get(examSession.classroom_id) as any)?.count || 0
          : 0;

        // Chỉ gửi danh sách cardId đã nộp (KHÔNG gửi đáp án cụ thể)
        io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.UPDATE_SUBMITTED_STUDENTS, {
          submittedCardIds: Object.keys(session.answers).map(Number),
          totalStudents,
        });
      }
    });

    // === Khóa câu hỏi (hết giờ hoặc GV ấn) ===
    socket.on(SOCKET_EVENTS.LOCK_QUESTION, ({ sessionId }) => {
      const session = activeSessions.get(sessionId);
      if (!session || session.isLocked) return;

      session.isLocked = true;

      const db = getDB();
      const question = db.prepare(
        'SELECT * FROM questions WHERE id = ?'
      ).get(session.currentQuestionId) as any;
      const examSession = db.prepare(
        'SELECT classroom_id FROM exam_sessions WHERE id = ?'
      ).get(sessionId) as any;

      // Tính phân bố đáp án
      const distribution = { A: 0, B: 0, C: 0, D: 0 };
      Object.values(session.answers).forEach((ans) => {
        if (ans in distribution) distribution[ans as keyof typeof distribution]++;
      });

      // Lưu kết quả vào database
      if (question && examSession) {
        const students = db.prepare(
          'SELECT * FROM students WHERE classroom_id = ?'
        ).all(examSession.classroom_id) as any[];

        const insertAnswer = db.prepare(`
          INSERT OR IGNORE INTO session_answers
            (id, session_id, question_id, student_id, selected_option, is_correct)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction(() => {
          students.forEach((student) => {
            const answer = session.answers[student.card_id];
            if (answer) {
              insertAnswer.run(
                uuid(),
                sessionId,
                session.currentQuestionId,
                student.id,
                answer,
                answer === question.correct_option ? 1 : 0
              );
            }
          });
        });
        insertMany();
      }

      // Broadcast kết quả (bây giờ MỚI hiện đáp án)
      io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.QUESTION_LOCKED, {
        correctOption: question?.correct_option || 'A',
        answerDistribution: distribution,
        finalAnswers: session.answers,
      });

      console.log(`🔒 Question locked in session ${sessionId}`);
    });

    // === Kết thúc phiên ===
    socket.on(SOCKET_EVENTS.END_SESSION, ({ sessionId }) => {
      const db = getDB();
      db.prepare("UPDATE exam_sessions SET status = 'COMPLETED' WHERE id = ?").run(sessionId);
      activeSessions.delete(sessionId);

      io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.SESSION_ENDED, { sessionId });
      console.log(`🏁 Session ended: ${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`👋 Client disconnected: ${socket.id}`);
    });
  });
}
```

### 7.4. Thuật toán nhận diện ArUco (Python reference → Flutter/Dart)

```python
# scripts/test-camera.py — Python reference cho thuật toán
import cv2
import numpy as np

aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
parameters = cv2.aruco.DetectorParameters()
detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)

def detect_cards(frame):
    """Phát hiện thẻ ArUco và xác định đáp án dựa trên góc xoay."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    corners, ids, rejected = detector.detectMarkers(gray)

    results = []
    if ids is not None:
        for i in range(len(ids)):
            card_id = int(ids[i][0])
            corner = corners[i][0]  # 4 đỉnh theo chiều kim đồng hồ

            # Vector cạnh trên của thẻ (từ p0 đến p1)
            p0, p1 = corner[0], corner[1]
            dx, dy = p1[0] - p0[0], p1[1] - p0[1]

            # Tính góc xoay (radian → degree)
            angle = np.degrees(np.arctan2(dy, dx))

            # Quy ước đáp án theo góc xoay
            #   A: 0°   (cạnh trên hướng phải)   → -45° đến 45°
            #   B: 90°  (cạnh trên hướng xuống)   → 45° đến 135°
            #   C: 180° (cạnh trên hướng trái)    → >135° hoặc <-135°
            #   D: 270° (cạnh trên hướng lên)     → -135° đến -45°
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

**Tương ứng trong Flutter/Dart (`apps/mobile/lib/utils/angle_calculator.dart`):**

```dart
import 'dart:math';

/// Tính đáp án từ 4 đỉnh corner của ArUco marker
String calculateAnswer(List<List<double>> corners) {
  // corners[0] = top-left, corners[1] = top-right (theo chiều kim đồng hồ)
  final p0 = corners[0];
  final p1 = corners[1];

  final dx = p1[0] - p0[0];
  final dy = p1[1] - p0[1];

  // atan2 trả về radian, convert sang degree
  final angle = (dx == 0 && dy == 0) ? 0.0 : _radToDeg(atan2(dy, dx));

  if (angle >= -45 && angle <= 45) return 'A';
  if (angle > 45 && angle <= 135) return 'B';
  if (angle > 135 || angle <= -135) return 'C';
  return 'D';
}

double _radToDeg(double rad) => rad * 180.0 / pi;
```

### 7.5. React Hook useSocket — `apps/web/src/hooks/useSocket.ts`

```typescript
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@pickball/shared/constants';
import type {
  QuestionStartedPayload,
  UpdateSubmittedPayload,
  QuestionLockedPayload,
} from '@pickball/shared/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket(sessionId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionStartedPayload | null>(null);
  const [submittedCardIds, setSubmittedCardIds] = useState<number[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockData, setLockData] = useState<QuestionLockedPayload | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit(SOCKET_EVENTS.JOIN_AS_PROJECTOR, { sessionId });
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on(SOCKET_EVENTS.QUESTION_STARTED, (data: QuestionStartedPayload) => {
      setCurrentQuestion(data);
      setSubmittedCardIds([]);
      setIsLocked(false);
      setLockData(null);
    });

    socket.on(SOCKET_EVENTS.UPDATE_SUBMITTED_STUDENTS, (data: UpdateSubmittedPayload) => {
      setSubmittedCardIds(data.submittedCardIds);
      setTotalStudents(data.totalStudents);
    });

    socket.on(SOCKET_EVENTS.QUESTION_LOCKED, (data: QuestionLockedPayload) => {
      setIsLocked(true);
      setLockData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const nextQuestion = useCallback((questionId: string, timeLimit: number) => {
    socketRef.current?.emit(SOCKET_EVENTS.NEXT_QUESTION, {
      sessionId,
      questionId,
      timeLimit,
    });
  }, [sessionId]);

  const lockQuestion = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.LOCK_QUESTION, { sessionId });
  }, [sessionId]);

  const endSession = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.END_SESSION, { sessionId });
  }, [sessionId]);

  return {
    isConnected,
    currentQuestion,
    submittedCardIds,
    totalStudents,
    isLocked,
    lockData,
    nextQuestion,
    lockQuestion,
    endSession,
  };
}
```

### 7.6. Countdown Timer Hook — `apps/web/src/hooks/useTimer.ts`

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(initialTime: number, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Reset khi câu hỏi mới
  const reset = useCallback((newTime: number) => {
    setTimeLeft(newTime);
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft <= 0 && isRunning) {
        setIsRunning(false);
        onExpireRef.current();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isRunning]);

  return {
    timeLeft,
    isRunning,
    isWarning: timeLeft <= 5 && timeLeft > 0,  // < 5s → cảnh báo đỏ
    isDanger: timeLeft <= 0,
    progress: initialTime > 0 ? timeLeft / initialTime : 0,
    reset,
    stop,
  };
}
```

### 7.7. Projector View Component — `apps/web/src/components/projector/ProjectorView.tsx`

```tsx
'use client';

import React, { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useTimer } from '@/hooks/useTimer';
import { CountdownTimer } from './CountdownTimer';
import { AnswerOptions } from './AnswerOptions';
import { StudentGrid } from './StudentGrid';
import { ResultChart } from './ResultChart';

interface Props {
  sessionId: string;
  questions: Array<{ id: string; question_order: number; time_limit: number }>;
}

export function ProjectorView({ sessionId, questions }: Props) {
  const {
    isConnected,
    currentQuestion,
    submittedCardIds,
    totalStudents,
    isLocked,
    lockData,
    nextQuestion,
    lockQuestion,
  } = useSocket(sessionId);

  const timer = useTimer(
    currentQuestion?.timeLimit || 30,
    () => lockQuestion() // Tự động khóa khi hết giờ
  );

  // Reset timer khi có câu hỏi mới
  useEffect(() => {
    if (currentQuestion) {
      timer.reset(currentQuestion.timeLimit);
    }
  }, [currentQuestion]);

  // Bắt đầu câu hỏi đầu tiên
  const handleStart = () => {
    if (questions.length > 0) {
      nextQuestion(questions[0].id, questions[0].time_limit);
    }
  };

  // Chuyển câu tiếp theo
  const handleNext = () => {
    if (!currentQuestion) return;
    const currentIdx = questions.findIndex(q => q.id === currentQuestion.questionId);
    if (currentIdx < questions.length - 1) {
      const next = questions[currentIdx + 1];
      nextQuestion(next.id, next.time_limit);
    }
  };

  // Fullscreen API
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  if (!currentQuestion) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">🎯 Sẵn sàng bắt đầu</h1>
          <p className="text-slate-400 mb-8">Tổng cộng {questions.length} câu hỏi</p>
          <button onClick={handleStart} className="btn-primary text-2xl px-12 py-4">
            ▶ BẮT ĐẦU
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col p-6 overflow-hidden">
      {/* Header: Tiến độ + Countdown */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-medium text-slate-400">
          Câu {currentQuestion.questionOrder} / {currentQuestion.totalQuestions}
        </div>
        <CountdownTimer
          timeLeft={timer.timeLeft}
          total={currentQuestion.timeLimit}
          isWarning={timer.isWarning}
        />
      </div>

      {/* Nội dung câu hỏi */}
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 border border-slate-700">
        <h2 className="text-2xl font-bold leading-relaxed">{currentQuestion.content}</h2>
      </div>

      {/* 4 Đáp án */}
      <AnswerOptions
        options={{
          A: currentQuestion.optionA,
          B: currentQuestion.optionB,
          C: currentQuestion.optionC,
          D: currentQuestion.optionD,
        }}
        correctOption={isLocked ? lockData?.correctOption : undefined}
        distribution={isLocked ? lockData?.answerDistribution : undefined}
      />

      {/* Kết quả khi hết giờ */}
      {isLocked && lockData && (
        <ResultChart
          distribution={lockData.answerDistribution}
          correctOption={lockData.correctOption}
          totalSubmitted={submittedCardIds.length}
        />
      )}

      {/* Grid học sinh */}
      <div className="flex-1 mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">
            Đã nộp: {submittedCardIds.length}/{totalStudents} học sinh
          </span>
          <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${totalStudents > 0
                  ? (submittedCardIds.length / totalStudents) * 100
                  : 0}%`
              }}
            />
          </div>
        </div>
        <StudentGrid
          totalStudents={totalStudents}
          submittedCardIds={submittedCardIds}
          isLocked={isLocked}
          finalAnswers={lockData?.finalAnswers}
          correctOption={lockData?.correctOption}
        />
      </div>

      {/* Nút điều khiển */}
      {isLocked && (
        <div className="flex justify-center mt-4">
          <button onClick={handleNext} className="btn-primary text-xl px-10 py-3">
            ▶ CÂU TIẾP THEO
          </button>
        </div>
      )}
    </div>
  );
}
```

### 7.8. Script sinh thẻ ArUco PDF — `scripts/generate-aruco-cards.py`

```python
"""
Sinh bộ 50 thẻ ArUco DICT_4X4_50 ra file PDF sẵn sàng in.
Chạy: python scripts/generate-aruco-cards.py

Output: scripts/output/aruco_cards_50.pdf
"""

import cv2
import numpy as np
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
import os
import tempfile

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_aruco_cards(count=50, dict_type=cv2.aruco.DICT_4X4_50):
    """Sinh PDF chứa các thẻ ArUco."""
    aruco_dict = cv2.aruco.getPredefinedDictionary(dict_type)
    pdf_path = os.path.join(OUTPUT_DIR, f'aruco_cards_{count}.pdf')
    c = canvas.Canvas(pdf_path, pagesize=A5)
    page_w, page_h = A5  # ~14.8cm x 21cm

    for card_id in range(1, count + 1):
        # === MẶT TRƯỚC ===
        # Sinh ArUco marker image
        marker_img = cv2.aruco.generateImageMarker(aruco_dict, card_id, 400)

        # Lưu tạm thành file PNG
        tmp_path = os.path.join(tempfile.gettempdir(), f'aruco_{card_id}.png')
        cv2.imwrite(tmp_path, marker_img)

        # Vẽ lên PDF
        marker_size = 8 * cm
        x = (page_w - marker_size) / 2
        y = (page_h - marker_size) / 2

        # Vẽ viền trắng (quiet zone)
        c.setFillColorRGB(1, 1, 1)
        c.rect(x - 1.5*cm, y - 1.5*cm,
               marker_size + 3*cm, marker_size + 3*cm, fill=1)

        # Vẽ marker
        c.drawImage(tmp_path, x, y, marker_size, marker_size)

        # Thêm nhãn 4 hướng A/B/C/D (mờ nhạt)
        c.setFillColorRGB(0.7, 0.7, 0.7)
        c.setFont("Helvetica-Bold", 24)
        center_x = page_w / 2
        c.drawCentredString(center_x, y + marker_size + 1.5*cm, "A")
        c.drawCentredString(center_x, y - 2*cm, "C")

        c.saveState()
        c.translate(x - 2*cm, page_h / 2)
        c.rotate(90)
        c.drawCentredString(0, 0, "D")
        c.restoreState()

        c.saveState()
        c.translate(x + marker_size + 2*cm, page_h / 2)
        c.rotate(-90)
        c.drawCentredString(0, 0, "B")
        c.restoreState()

        # Số thẻ ở góc
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1*cm, 1*cm, f"#{card_id:02d}")

        c.showPage()

        # === MẶT SAU ===
        c.setFont("Helvetica-Bold", 36)
        c.drawCentredString(page_w / 2, page_h / 2 + 2*cm, f"The #{card_id:02d}")

        c.setFont("Helvetica", 12)
        guide_text = [
            "Huong dan xoay the:",
            "Chu A huong len = Dap an A",
            "Chu B huong len = Dap an B",
            "Chu C huong len = Dap an C",
            "Chu D huong len = Dap an D",
        ]
        y_text = page_h / 2 - 1*cm
        for line in guide_text:
            c.drawCentredString(page_w / 2, y_text, line)
            y_text -= 0.6*cm

        c.showPage()

        # Cleanup
        os.remove(tmp_path)

    c.save()
    print(f"Generated {count} ArUco cards at {pdf_path}")
    return pdf_path


if __name__ == '__main__':
    generate_aruco_cards()
```

---

## 8. LỊCH TRÌNH THỰC HIỆN (SPRINT 14 NGÀY)

```
PHASE 1: NEN TANG (Ngay 1-3)

  Ngay 1 — Setup & Database
    - Khoi tao monorepo (npm workspaces)
    - Tao shared package (types + constants)
    - Tao backend Express + SQLite
    - Viet database migration
    - Script seed du lieu test

  Ngay 2 — REST API CRUD
    - API: Classrooms (CRUD + bulk import students)
    - API: Quizzes (CRUD)
    - API: Questions (CRUD + reorder)
    - API: Sessions (Create + Status)
    - Test API bang Postman / Thunder Client

  Ngay 3 — Script ArUco + PDF
    - Viet script Python sinh 50 ma ArUco
    - Export ra PDF 2 mat (mat truoc marker + mat sau huong dan)
    - Tich hop endpoint GET /cards/pdf
    - Test in thu tren giay A5

PHASE 2: WEB DASHBOARD (Ngay 4-6)

  Ngay 4 — Layout & Navigation
    - Tao Next.js app (App Router + Tailwind)
    - Design system: Colors, Typography, Components UI co ban
    - Layout: Sidebar + Navbar + responsive
    - Landing page / Dashboard

  Ngay 5 — Quan ly Lop & De
    - Trang tao lop (paste danh sach HS tu Excel)
    - Trang chi tiet lop (danh sach HS, sua, xoa)
    - Trang soan de (them cau hoi, chon dap an dung, set timer)
    - Trang danh sach de

  Ngay 6 — Tao phien thi + Ket qua
    - Trang tao phien thi (chon lop + de)
    - Trang ket qua (bang diem chi tiet)
    - Xuat Excel/CSV
    - Bieu do phan bo diem (Recharts)

PHASE 3: REALTIME & PROJECTOR (Ngay 7-9)

  Ngay 7 — WebSocket Server
    - Tich hop Socket.io vao Express server
    - Viet sessionHandler (join, next_question, lock, end)
    - Viet scanHandler (submit_scanned_batch, update)
    - Test WebSocket bang client gia lap

  Ngay 8 — Projector View (Man hinh chinh)
    - Component ProjectorView (fullscreen)
    - CountdownTimer (circle animation, pulse khi < 5s)
    - StudentGrid (realtime update o da nop)
    - AnswerOptions (4 khoi mau, highlight dap an dung)
    - ResultChart (bar chart % A-B-C-D khi het gio)

  Ngay 9 — Tich hop & Polish
    - Ket noi useSocket hook vao ProjectorView
    - Logic tu dong khoa khi timer het
    - Logic chuyen cau tiep theo
    - Fullscreen API
    - Animation & transitions muot ma

PHASE 4: MOBILE APP (Ngay 10-12)

  Ngay 10 — Flutter Setup & Camera
    - Tao Flutter project
    - Cau hinh camera permission (Android + iOS)
    - Hien live camera feed
    - Tich hop opencv_dart package

  Ngay 11 — ArUco Detection
    - Nhan dien ArUco marker tu camera frame
    - Tinh goc xoay -> dap an (A/B/C/D)
    - Ve bounding box overlay + nhan
    - Multi-marker detection (nhieu the cung luc)

  Ngay 12 — Socket.io & Tich hop
    - Ket noi Socket.io client (socket_io_client package)
    - Gui batch scan results moi 200ms
    - Nhan events: question_started, question_locked
    - UI: Bottom bar (trang thai + nut dieu khien)
    - Vibration feedback khi quet thanh cong

PHASE 5: TEST & DEPLOY (Ngay 13-14)

  Ngay 13 — Integration Test
    - Test end-to-end: Mobile quet -> Server -> Web hien thi
    - Test trong phong thuc te (may chieu + camera dien thoai)
    - Test khoang cach: 3m, 5m, 8m
    - Test den: den tuyp, den LED, anh sang tu nhien
    - Fix bugs & optimize performance

  Ngay 14 — Deploy & Documentation
    - Deploy backend len VPS / Railway / Render
    - Deploy web len Vercel
    - Build APK/IPA cho mobile
    - Viet README & huong dan su dung
    - Gui ban demo cho stakeholders
```

---

## 9. QUY CÁCH IN THẺ GIẤY

### 9.1. Thông số kỹ thuật

| Thông số | Giá trị | Lý do |
| :--- | :--- | :--- |
| **Kích thước giấy** | A5 (148mm x 210mm) | Đủ lớn để camera bắt được từ 6-8m |
| **Loại giấy** | Bìa cứng 160-250 gsm | Không bị cong, cầm chắc tay |
| **Bề mặt** | Cán mờ (Matte) | KHÔNG cán bóng (Glossy) — bị lóa đèn |
| **Viền trắng** | Tối thiểu 1.5cm xung quanh | Quiet zone để ArUco nhận diện chính xác |
| **Mã ArUco** | DICT_4X4_50, kích thước 8x8cm | Bit ít, dễ nhận từ xa |

### 9.2. Layout thẻ

```
MAT TRUOC                          MAT SAU
+----------------------+           +----------------------+
|          A           |           |                      |
|                      |           |                      |
|    +------------+    |           |    The #05           |
| D  |            | B  |           |                      |
|    |   ArUco    |    |           |  Huong dan:           |
|    |   Marker   |    |           |  A huong len = Dap A  |
|    |   #05      |    |           |  B huong len = Dap B  |
|    +------------+    |           |  C huong len = Dap C  |
|                      |           |  D huong len = Dap D  |
|          C           |           |                      |
|                      |           |                      |
|  #05          1.5cm  |           |                      |
+----------------------+           +----------------------+
```

### 9.3. Lưu ý khi in

1. **Máy in laser** cho chất lượng tốt nhất (mực không lem khi mồ hôi tay)
2. **In 2 mặt** (duplex): Mặt trước = mã, mặt sau = số thẻ + hướng dẫn
3. **Test trước 5 thẻ**: In 5 thẻ, test quét bằng điện thoại ở khoảng cách 3m, 5m, 8m
4. **Cắt thẻ**: Dùng dao cắt giấy (paper trimmer) để các thẻ đều nhau

---

## 10. HƯỚNG DẪN DEPLOY PRODUCTION

### 10.1. Tổng quan kiến trúc Deploy

```
+--------------------------------------------------------------+
|                    PRODUCTION DEPLOYMENT                      |
+--------------------------------------------------------------+
|                                                              |
|  Vercel        Railway /      Neon /                         |
|  (Web App) --> Render     --> Supabase                       |
|  Next.js       (Backend)     (PostgreSQL)                    |
|  Free tier     Node.js       Free tier                       |
|                Socket.io                                     |
|  Google Play   $5-7/thang                                    |
|  / App Store                                                 |
|  (Mobile APK)                                                |
|                                                              |
+--------------------------------------------------------------+
```

### 10.2. Deploy Backend (Railway)

```bash
# 1. Cai Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Tao project moi
cd apps/server
railway init

# 4. Them PostgreSQL (thay SQLite cho production)
railway add --plugin postgresql

# 5. Set bien moi truong
railway variables set PORT=3001
railway variables set CORS_ORIGIN=https://your-app.vercel.app

# 6. Deploy
railway up
```

**Lưu ý chuyển từ SQLite sang PostgreSQL cho production:**
- Thay `better-sqlite3` bằng `pg` (node-postgres) hoặc `drizzle-orm`
- Schema giữ nguyên, chỉ thay kiểu dữ liệu:
  - `TEXT PRIMARY KEY` → `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `INTEGER NOT NULL` (boolean) → `BOOLEAN NOT NULL`

### 10.3. Deploy Web App (Vercel)

```bash
# 1. Cai Vercel CLI
npm install -g vercel

# 2. Deploy
cd apps/web
vercel

# 3. Set bien moi truong tren Vercel Dashboard
# NEXT_PUBLIC_API_URL = https://your-backend.railway.app
# NEXT_PUBLIC_SOCKET_URL = https://your-backend.railway.app
```

Hoặc kết nối GitHub repo → Vercel auto-deploy khi push.

### 10.4. Build Mobile App

```bash
# Android APK
cd apps/mobile
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk

# Android App Bundle (cho Google Play)
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab

# iOS (can macOS + Xcode)
flutter build ios --release
# Sau do dung Xcode Archive de upload len App Store Connect
```

### 10.5. Deploy tự host (Docker Compose)

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./apps/server
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DATABASE_URL=postgresql://postgres:password@db:5432/pickball
      - CORS_ORIGIN=https://your-domain.com
    depends_on:
      - db

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.your-domain.com
      - NEXT_PUBLIC_SOCKET_URL=https://api.your-domain.com

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pickball
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - backend
      - web

volumes:
  postgres_data:
```

### 10.6. Checklist trước khi Go-Live

- [ ] Database backup strategy (daily cron)
- [ ] SSL/HTTPS cho cả Web + API
- [ ] Rate limiting trên API
- [ ] WebSocket connection limit
- [ ] Error logging (Sentry hoặc tương tự)
- [ ] Test trên 3+ thiết bị Android khác nhau
- [ ] Test trên iPhone (nếu build iOS)
- [ ] Test với 40+ thẻ đồng thời trong lớp học thực tế
- [ ] Hướng dẫn sử dụng cho giáo viên (video ngắn 3-5 phút)
- [ ] Backup plan: nếu WiFi chập chờn, có thể quét offline rồi sync sau

---

## PHỤ LỤC

### A. Lệnh thường dùng

```bash
# Development
npm run dev                    # Chạy cả server + web
npm run dev:server             # Chỉ chạy backend
npm run dev:web                # Chỉ chạy web
npm run seed                   # Seed dữ liệu test
npm run generate:cards         # Sinh PDF thẻ ArUco

# Mobile
cd apps/mobile
flutter run                    # Chạy trên emulator/device
flutter run -d chrome          # Chạy trên browser (debug)
flutter build apk              # Build APK

# Production
npm run build                  # Build cả server + web
vercel --prod                  # Deploy web lên Vercel
railway up                     # Deploy server lên Railway
```

### B. Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
| :--- | :--- | :--- |
| Mobile không kết nối server | Dùng `localhost` | Đổi thành IP LAN: `192.168.x.x` |
| Thẻ quét không ra | Ánh sáng phản xạ | Dùng giấy matte, tránh đèn chiếu thẳng |
| Camera không mở trên iOS | Thiếu permission | Thêm `NSCameraUsageDescription` trong Info.plist |
| WebSocket disconnect liên tục | WiFi yếu | Dùng Socket.io (tự reconnect) thay ws thuần |
| Timer không đồng bộ | Client-side timer | Server là source of truth, client chỉ hiển thị |
| SQLite bị lock | Multiple writes | Dùng WAL mode (`PRAGMA journal_mode = WAL`) |

### C. Tài liệu tham khảo

- [ArUco Markers - OpenCV](https://docs.opencv.org/4.x/d5/dae/tutorial_aruco_detection.html)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [Flutter Camera Plugin](https://pub.dev/packages/camera)
- [opencv_dart Package](https://pub.dev/packages/opencv_dart)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
