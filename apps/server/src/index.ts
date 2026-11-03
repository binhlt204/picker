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
    origin: '*', // Cho phép kết nối từ cả Web App và Mobile App trên mạng cục bộ
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

// Trang chủ Backend API
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Pickball Backend API Server</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 40px; max-width: 520px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        h1 { color: #38bdf8; margin: 0 0 10px 0; font-size: 28px; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
        .badge { display: inline-block; padding: 4px 12px; background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 999px; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
        .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 16px; margin-top: 15px; transition: 0.2s; }
        .btn:hover { background: #1d4ed8; }
        .links { margin-top: 25px; font-size: 13px; color: #64748b; border-top: 1px solid #334155; padding-top: 20px; }
        .links a { color: #38bdf8; text-decoration: none; margin: 0 8px; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">● Backend Server Đang Chạy (Port 3001)</span>
        <h1>Pickball Realtime Server</h1>
        <p>Đây là cổng API & WebSocket ngầm của hệ thống. Để xem giao diện sử dụng (quản lý lớp, đề thi, máy chiếu), bạn hãy mở <strong>Web App tại Port 3000</strong>:</p>
        <a href="http://localhost:3000" class="btn">👉 Mở Giao Diện Web App (Port 3000)</a>
        <div class="links">
          <a href="/api/health">Kiểm tra Health</a> • 
          <a href="/api/cards/pdf">Tải PDF 50 Thẻ</a> • 
          <a href="/api/sessions">API Sessions</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

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
  console.log(`📡 WebSocket ready on port ${PORT}`);
});
