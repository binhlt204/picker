import { Server, Socket } from 'socket.io';
import { getDB } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { SOCKET_EVENTS } from '@pickball/shared';

interface ActiveSession {
  sessionId: string;
  currentQuestionId: string | null;
  isLocked: boolean;
  answers: Record<number, string>;  // cardId → answer ('A' | 'B' | 'C' | 'D')
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

      // Nếu session đang có câu hỏi đang chạy, gửi ngay trạng thái cho máy chiếu
      const session = activeSessions.get(sessionId);
      if (session && session.currentQuestionId) {
        const db = getDB();
        const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(session.currentQuestionId) as any;
        const totalQ = db.prepare('SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?').get(question.quiz_id) as any;
        const examSession = db.prepare('SELECT classroom_id FROM exam_sessions WHERE id = ?').get(sessionId) as any;
        const totalStudents = examSession
          ? (db.prepare('SELECT COUNT(*) as count FROM students WHERE classroom_id = ?').get(examSession.classroom_id) as any)?.count || 0
          : 0;

        socket.emit(SOCKET_EVENTS.QUESTION_STARTED, {
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

        socket.emit(SOCKET_EVENTS.UPDATE_SUBMITTED_STUDENTS, {
          submittedCardIds: Object.keys(session.answers).map(Number),
          totalStudents,
        });

        if (session.isLocked) {
          const distribution = { A: 0, B: 0, C: 0, D: 0 };
          Object.values(session.answers).forEach((ans) => {
            if (ans in distribution) distribution[ans as keyof typeof distribution]++;
          });
          socket.emit(SOCKET_EVENTS.QUESTION_LOCKED, {
            correctOption: question.correct_option,
            answerDistribution: distribution,
            finalAnswers: session.answers,
          });
        }
      }
    });

    socket.on(SOCKET_EVENTS.JOIN_AS_SCANNER, ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      console.log(`📷 Scanner joined session: ${sessionId}`);

      const session = activeSessions.get(sessionId);
      if (session && session.currentQuestionId) {
        const db = getDB();
        const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(session.currentQuestionId) as any;
        const totalQ = db.prepare('SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?').get(question.quiz_id) as any;

        socket.emit(SOCKET_EVENTS.QUESTION_STARTED, {
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
      }
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

      // Cập nhật trạng thái phiên trong DB
      db.prepare(`
        UPDATE exam_sessions
        SET status = 'ACTIVE', current_question_order = ?
        WHERE id = ?
      `).run(question.question_order, sessionId);

      // Cập nhật session in-memory state
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

      console.log(`▶️ Question started: Order ${question.question_order} (ID: ${question.id}) in session ${sessionId}`);
    });

    // === Nhận kết quả quét (từ mobile camera) ===
    socket.on(SOCKET_EVENTS.SUBMIT_SCANNED_BATCH, ({ sessionId, questionId, records }) => {
      const session = activeSessions.get(sessionId);
      if (!session || session.isLocked || session.currentQuestionId !== questionId) {
        return; // Bỏ qua nếu session không hợp lệ hoặc đã bị khóa
      }

      let hasNewAnswers = false;
      records.forEach(({ cardId, answer }: { cardId: number; answer: string }) => {
        if (!session.answers[cardId] && ['A', 'B', 'C', 'D'].includes(answer)) {
          session.answers[cardId] = answer;
          hasNewAnswers = true;
        }
      });

      if (hasNewAnswers) {
        const db = getDB();
        const examSession = db.prepare(
          'SELECT classroom_id FROM exam_sessions WHERE id = ?'
        ).get(sessionId) as any;
        const totalStudents = examSession
          ? (db.prepare(
              'SELECT COUNT(*) as count FROM students WHERE classroom_id = ?'
            ).get(examSession.classroom_id) as any)?.count || 0
          : 0;

        // Chỉ gửi danh sách cardId đã nộp để Projector hiển thị ô tick (KHÔNG gửi lộ đáp án cụ thể)
        io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.UPDATE_SUBMITTED_STUDENTS, {
          submittedCardIds: Object.keys(session.answers).map(Number),
          totalStudents,
        });
      }
    });

    // === Khóa câu hỏi (hết giờ hoặc GV bấm Khóa) ===
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

      // Phân bố đáp án
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
          INSERT OR REPLACE INTO session_answers
            (id, session_id, question_id, student_id, selected_option, is_correct, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        const insertMany = db.transaction(() => {
          students.forEach((student) => {
            const answer = session.answers[student.card_id];
            if (answer) {
              insertAnswer.run(
                uuidv4(),
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

      // Broadcast kết quả tới tất cả client trong room (hiện đáp án đúng + phân bố %)
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
