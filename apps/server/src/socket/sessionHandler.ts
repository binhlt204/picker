import { Server, Socket } from 'socket.io';
import { getDB } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { SOCKET_EVENTS } from '@pickball/shared';

export interface ActiveSession {
  sessionId: string;
  currentQuestionId: string | null;
  isLocked: boolean;
  answers: Record<number, string>; // cardId -> answer ('A' | 'B' | 'C' | 'D')
  timeLimit: number;
}

const activeSessions: Map<string, ActiveSession> = new Map();
let ioInstance: Server | null = null;

export function getOrCreateActiveSession(sessionId: string): ActiveSession | null {
  let session = activeSessions.get(sessionId);
  if (session) return session;

  const db = getDB();
  const examSession = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(sessionId) as any;
  if (!examSession) return null;

  // Tim cau hoi hien tai
  const order = examSession.current_question_order || 1;
  const question = db.prepare(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_order ASC LIMIT 1 OFFSET ?'
  ).get(examSession.quiz_id, Math.max(0, order - 1)) as any;

  if (!question) return null;

  // Load existing answers
  const existingAnswers = db.prepare(`
    SELECT st.card_id, a.selected_option
    FROM session_answers a
    JOIN students st ON a.student_id = st.id
    WHERE a.session_id = ? AND a.question_id = ?
  `).all(sessionId, question.id) as any[];

  const answersMap: Record<number, string> = {};
  existingAnswers.forEach((r) => {
    answersMap[r.card_id] = r.selected_option;
  });

  session = {
    sessionId,
    currentQuestionId: question.id,
    isLocked: examSession.status === 'COMPLETED',
    answers: answersMap,
    timeLimit: question.time_limit || 30,
  };

  activeSessions.set(sessionId, session);
  return session;
}

export function submitAnswers(sessionId: string, records: Array<{ cardId: number; answer: string }>) {
  const session = getOrCreateActiveSession(sessionId);
  if (!session || session.isLocked || !session.currentQuestionId) {
    return { success: false, reason: 'Session not active or locked', accepted: [] };
  }

  const db = getDB();
  const examSession = db.prepare('SELECT classroom_id FROM exam_sessions WHERE id = ?').get(sessionId) as any;
  if (!examSession) return { success: false, reason: 'Exam session not found', accepted: [] };

  const students = db.prepare('SELECT id, card_id, full_name FROM students WHERE classroom_id = ?').all(examSession.classroom_id) as any[];
  const studentMap = new Map<number, { id: string; name: string }>();
  students.forEach(s => studentMap.set(s.card_id, { id: s.id, name: s.full_name }));

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(session.currentQuestionId) as any;

  let hasNew = false;
  const accepted: Array<{ cardId: number; studentName: string; answer: string }> = [];

  records.forEach(({ cardId, answer }) => {
    const validAnswer = ['A', 'B', 'C', 'D'].includes(answer);
    const student = studentMap.get(cardId);
    if (validAnswer && student) {
      if (session.answers[cardId] !== answer) {
        session.answers[cardId] = answer;
        hasNew = true;
      }
      accepted.push({ cardId, studentName: student.name, answer });

      // Lưu/cập nhật vào database
      if (question) {
        db.prepare(`
          INSERT INTO session_answers (id, session_id, question_id, student_id, selected_option, is_correct, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(session_id, question_id, student_id)
          DO UPDATE SET selected_option = excluded.selected_option, is_correct = excluded.is_correct, submitted_at = excluded.submitted_at
        `).run(
          uuidv4(),
          sessionId,
          session.currentQuestionId,
          student.id,
          answer,
          answer === question.correct_option ? 1 : 0
        );
      }
    }
  });

  if (hasNew && ioInstance) {
    ioInstance.to(`session:${sessionId}`).emit(SOCKET_EVENTS.UPDATE_SUBMITTED_STUDENTS, {
      submittedCardIds: Object.keys(session.answers).map(Number),
      totalStudents: students.length,
    });
  }

  return { success: true, accepted };
}

export function setupSocketHandlers(io: Server) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`📱 Client connected: ${socket.id}`);

    // === Tham gia room ===
    socket.on(SOCKET_EVENTS.JOIN_AS_PROJECTOR, ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      console.log(`🖥️  Projector joined session: ${sessionId}`);

      const session = getOrCreateActiveSession(sessionId);
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
          correctOption: question.correct_option,
          timeLimit: session.timeLimit,
          totalQuestions: totalQ?.count || 0,
        });

        const dist = { A: 0, B: 0, C: 0, D: 0 };
        Object.values(session.answers).forEach((ans) => {
          if (ans in dist) dist[ans as keyof typeof dist]++;
        });

        socket.emit(SOCKET_EVENTS.UPDATE_SUBMITTED_STUDENTS, {
          submittedCardIds: Object.keys(session.answers).map(Number),
          totalStudents,
          answerDistribution: dist,
          answers: session.answers,
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

      const session = getOrCreateActiveSession(sessionId);
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
          correctOption: question.correct_option,
          timeLimit: session.timeLimit,
          totalQuestions: totalQ?.count || 0,
        });

        const examSession = db.prepare('SELECT classroom_id FROM exam_sessions WHERE id = ?').get(sessionId) as any;
        const totalStudents = examSession
          ? (db.prepare('SELECT COUNT(*) as count FROM students WHERE classroom_id = ?').get(examSession.classroom_id) as any)?.count || 0
          : 0;

        const dist = { A: 0, B: 0, C: 0, D: 0 };
        Object.values(session.answers).forEach((ans) => {
          if (ans in dist) dist[ans as keyof typeof dist]++;
        });

        socket.emit(SOCKET_EVENTS.UPDATE_SUBMITTED_STUDENTS, {
          submittedCardIds: Object.keys(session.answers).map(Number),
          totalStudents,
          answerDistribution: dist,
          answers: session.answers,
        });
      }
    });

    // === Chuyển câu hỏi ===
    socket.on(SOCKET_EVENTS.NEXT_QUESTION, ({ sessionId, questionId, timeLimit }) => {
      const db = getDB();

      const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId) as any;
      if (!question) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Question not found' });
        return;
      }

      db.prepare(`
        UPDATE exam_sessions
        SET status = 'ACTIVE', current_question_order = ?
        WHERE id = ?
      `).run(question.question_order, sessionId);

      const session: ActiveSession = {
        sessionId,
        currentQuestionId: questionId,
        isLocked: false,
        answers: {},
        timeLimit: timeLimit || question.time_limit || 30,
      };
      activeSessions.set(sessionId, session);

      const totalQ = db.prepare(
        'SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?'
      ).get(question.quiz_id) as any;

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

      console.log(`▶️ Question started: Order ${question.question_order} in session ${sessionId}`);
    });

    // === Nhận kết quả quét (từ mobile camera hoặc web scanner) ===
    socket.on(SOCKET_EVENTS.SUBMIT_SCANNED_BATCH, ({ sessionId, questionId, records }) => {
      submitAnswers(sessionId, records);
    });

    // === Khóa câu hỏi (hết giờ hoặc GV bấm Khóa) ===
    socket.on(SOCKET_EVENTS.LOCK_QUESTION, ({ sessionId }) => {
      const session = activeSessions.get(sessionId);
      if (!session || session.isLocked || !session.currentQuestionId) return;

      session.isLocked = true;

      const db = getDB();
      const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(session.currentQuestionId) as any;

      const distribution = { A: 0, B: 0, C: 0, D: 0 };
      Object.values(session.answers).forEach((ans) => {
        if (ans in distribution) distribution[ans as keyof typeof distribution]++;
      });

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
