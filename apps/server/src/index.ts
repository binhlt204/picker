import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { getDB } from './database';
import { setupSocketHandlers } from './socket/sessionHandler';
import { requireAuth, requireAdmin } from './auth/middleware';

// REST routes
import classroomRoutes from './routes/classrooms';
import studentRoutes from './routes/students';
import quizRoutes from './routes/quizzes';
import questionRoutes from './routes/questions';
import sessionRoutes from './routes/sessions';
import exportRoutes from './routes/export';
import adminRoutes from './routes/admin';
import adminResourceRoutes from './routes/adminResources';
import authRoutes from './routes/auth';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*', // Cho phép kết nối từ cả Web App và Mobile App trên mạng cục bộ
    methods: ['GET', 'POST'],
  },
});

// Middleware
// exposedHeaders: để web đọc được tên file khi tải PDF/Excel
app.use(cors({ exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: ['image/*', 'application/octet-stream'], limit: '10mb' }));

// Khởi tạo database
getDB();

// REST API Routes
// --- Đăng ký / đăng nhập / quên mật khẩu (công khai) ---
app.use('/api/auth', authRoutes);

// --- API quản lý dữ liệu: BẮT BUỘC đăng nhập ---
// /api/classrooms/* gồm cả danh sách học sinh theo lớp (studentRoutes bên dưới nằm cùng tiền tố)
app.use('/api/classrooms', requireAuth, classroomRoutes);
app.use('/api/quizzes', requireAuth, quizRoutes);      // gồm /api/quizzes/:id/questions
app.use('/api/students', requireAuth);                 // chặn /api/students/:id khi chưa đăng nhập
app.use('/api/questions', requireAuth);                // chặn /api/questions/:id khi chưa đăng nhập
app.use('/api', studentRoutes);
app.use('/api', questionRoutes);

// --- Dashboard quản trị (react-admin ở web /admin): chỉ admin ---
app.use('/api/admin/resources', requireAuth, requireAdmin, adminResourceRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

// --- Phiên thi: app điện thoại quét thẻ KHÔNG đăng nhập nên giữ mở các API nó dùng
//     (danh sách/chi tiết phiên, câu hiện tại, quét ảnh). Phần ghi/xem kết quả đã khóa trong routes/sessions.ts ---
app.use('/api/sessions', sessionRoutes);
app.use('/api', exportRoutes);

app.get('/download-app', (req, res) => res.download('D:/pickball/pickball-app.apk'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard quản trị nằm ở web (react-admin). Trang gốc của server chuyển hướng sang đó.
app.get('/', (req, res) => {
  res.redirect((process.env.WEB_URL || 'http://localhost:3000').replace(/\/+$/, '') + '/admin');
});

// WebSocket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on port ${PORT}`);
  console.log(`📊 Dashboard quản trị: ${(process.env.WEB_URL || 'http://localhost:3000').replace(/\/+$/, '')}/admin`);
});
