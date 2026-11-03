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
