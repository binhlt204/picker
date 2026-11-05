import { Server, Socket } from 'socket.io';
import { getDB } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { SOCKET_EVENTS } from '@pickball/shared';
import type { TimerSettings, TimerState } from '@pickball/shared';

export interface ActiveSession {
  sessionId: string;
  currentQuestionId: string | null;
  isLocked: boolean;
  answers: Record<number, string>; // cardId -> answer ('A' | 'B' | 'C' | 'D')
  timeLimit: number | null; // tổng số giây của câu hiện tại; null = không giới hạn
  endsAt: number | null; // thời điểm hết giờ (ms, đồng hồ server); null = không đếm giờ
  timerHandle?: NodeJS.Timeout; // hẹn giờ tự khóa câu
}

const activeSessions: Map<string, ActiveSession> = new Map();
let ioInstance: Server | null = null;

// Thời gian hợp lệ: 0 (không giới hạn) hoặc 5..600 giây
const MIN_TIME = 5;
const MAX_TIME = 600;

/* ===================== Cài đặt hẹn giờ ===================== */

export function loadTimerSettings(sessionId: string): TimerSettings {
  const row = getDB()
    .prepare('SELECT timer_enabled, time_limit_all, question_times FROM exam_sessions WHERE id = ?')
    .get(sessionId) as any;
  let questionTimes: Record<string, number> = {};
  try {
    questionTimes = row?.question_times ? JSON.parse(row.question_times) : {};
  } catch {
    questionTimes = {};
  }
  return {
    timerEnabled: row ? row.timer_enabled !== 0 : true,
    timeLimitAll: row && row.time_limit_all !== null && row.time_limit_all !== undefined ? Number(row.time_limit_all) : null,
    questionTimes,
  };
}

/** Thời gian thực tế của 1 câu: tắt đếm giờ > thời gian riêng câu đó > thời gian chung > thời gian trong ngân hàng đề. */
export function effectiveTimeLimit(settings: TimerSettings, question: { id: string; time_limit: number }): number | null {
  if (!settings.timerEnabled) return null;
  const own = settings.questionTimes[question.id];
  if (own !== undefined) return own > 0 ? own : null;
  if (settings.timeLimitAll !== null) return settings.timeLimitAll > 0 ? settings.timeLimitAll : null;
  return question.time_limit > 0 ? question.time_limit : null;
}

function timerState(session: ActiveSession | undefined | null): TimerState {
  return {
    timeLimit: session?.timeLimit ?? null,
    endsAt: session && !session.isLocked ? session.endsAt : null,
    serverNow: Date.now(),
  };
}

/** Bắt đầu (lại) đếm ngược cho câu hiện tại; seconds = null nghĩa là không giới hạn thời gian. */
function startCountdown(session: ActiveSession, seconds: number | null) {
  if (session.timerHandle) clearTimeout(session.timerHandle);
  session.timerHandle = undefined;
  session.timeLimit = seconds;
  if (seconds === null || session.isLocked) {
    session.endsAt = null;
    return;
  }
  session.endsAt = Date.now() + seconds * 1000;
  session.timerHandle = setTimeout(() => lockQuestion(session.sessionId), seconds * 1000);
}

/* ===================== Phiên đang chạy ===================== */

export function getOrCreateActiveSession(sessionId: string): ActiveSession | null {
  let session = activeSessions.get(sessionId);
  if (session) return session;

  const db = getDB();
  const examSession = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(sessionId) as any;
  if (!examSession) return null;

  // Phiên chưa bắt đầu (GV chưa bấm Bắt đầu): chưa có câu hiện tại. Máy chiếu hiện màn chờ,
  // và đổi cài đặt thời gian lúc này không làm câu 1 tự chạy đồng hồ.
  if (examSession.status === 'WAITING' || !examSession.current_question_order) return null;

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
    timeLimit: effectiveTimeLimit(loadTimerSettings(sessionId), question),
    endsAt: null,
  };
  activeSessions.set(sessionId, session);

  // Khôi phục sau khi server khởi động lại giữa chừng: câu đang chạy được đếm lại từ đầu.
  // Phiên chưa bắt đầu (WAITING) thì không tự đếm để không khóa câu chưa ai bắt đầu.
  if (examSession.status === 'ACTIVE' && !session.isLocked) {
    startCountdown(session, session.timeLimit);
  }
  return session;
}

/** Trạng thái đồng hồ cho REST API (/current-question). */
export function getTimerStateForSession(sessionId: string): TimerState {
  return timerState(activeSessions.get(sessionId));
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

/** Khóa câu hiện tại (GV bấm Khóa hoặc server tự khóa khi hết giờ) và gửi kết quả cho mọi thiết bị. */
function lockQuestion(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session || session.isLocked || !session.currentQuestionId) return;

  session.isLocked = true;
  if (session.timerHandle) clearTimeout(session.timerHandle);
  session.timerHandle = undefined;
  session.endsAt = null;

  const db = getDB();
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(session.currentQuestionId) as any;

  const distribution = { A: 0, B: 0, C: 0, D: 0 };
  Object.values(session.answers).forEach((ans) => {
    if (ans in distribution) distribution[ans as keyof typeof distribution]++;
  });

  ioInstance?.to(`session:${sessionId}`).emit(SOCKET_EVENTS.QUESTION_LOCKED, {
    correctOption: question?.correct_option || 'A',
    answerDistribution: distribution,
    finalAnswers: session.answers,
  });

  console.log(`🔒 Question locked in session ${sessionId}`);
}

function questionStartedPayload(session: ActiveSession, question: any, totalQuestions: number) {
  return {
    questionId: question.id,
    questionOrder: question.question_order,
    content: question.content,
    optionA: question.option_a,
    optionB: question.option_b,
    optionC: question.option_c,
    optionD: question.option_d,
    // Gửi kèm đáp án đúng để điện thoại GV biết ngay từ đầu.
    // Máy chiếu chỉ hiển thị đáp án sau khi khóa (dùng dữ liệu question_locked).
    correctOption: question.correct_option,
    totalQuestions,
    ...timerState(session),
  };
}

/** Gửi trạng thái câu hiện tại cho 1 thiết bị vừa vào phòng (máy chiếu hoặc điện thoại). */
function sendCurrentState(socket: Socket, sessionId: string, includeLocked: boolean) {
  const session = getOrCreateActiveSession(sessionId);
  socket.emit(SOCKET_EVENTS.TIMER_SETTINGS, {
    settings: loadTimerSettings(sessionId),
    current: session?.currentQuestionId ? { questionId: session.currentQuestionId, ...timerState(session) } : null,
  });
  if (!session || !session.currentQuestionId) return;

  const db = getDB();
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(session.currentQuestionId) as any;
  const totalQ = db.prepare('SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?').get(question.quiz_id) as any;
  const examSession = db.prepare('SELECT classroom_id FROM exam_sessions WHERE id = ?').get(sessionId) as any;
  const totalStudents = examSession
    ? (db.prepare('SELECT COUNT(*) as count FROM students WHERE classroom_id = ?').get(examSession.classroom_id) as any)?.count || 0
    : 0;

  socket.emit(SOCKET_EVENTS.QUESTION_STARTED, questionStartedPayload(session, question, totalQ?.count || 0));

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

  if (includeLocked && session.isLocked) {
    socket.emit(SOCKET_EVENTS.QUESTION_LOCKED, {
      correctOption: question.correct_option,
      answerDistribution: dist,
      finalAnswers: session.answers,
    });
  }
}

function parseTime(v: unknown): number | null | undefined {
  if (v === undefined) return undefined; // không đổi
  if (v === null || v === '') return null; // xóa (dùng mặc định)
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || (n > 0 && n < MIN_TIME) || n > MAX_TIME) {
    throw new Error(`Thời gian phải là 0 (không giới hạn) hoặc từ ${MIN_TIME} đến ${MAX_TIME} giây`);
  }
  return n;
}

export function setupSocketHandlers(io: Server) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`📱 Client connected: ${socket.id}`);

    // === Tham gia room ===
    socket.on(SOCKET_EVENTS.JOIN_AS_PROJECTOR, ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      console.log(`🖥️  Projector joined session: ${sessionId}`);
      sendCurrentState(socket, sessionId, true);
    });

    socket.on(SOCKET_EVENTS.JOIN_AS_SCANNER, ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      console.log(`📷 Scanner joined session: ${sessionId}`);
      sendCurrentState(socket, sessionId, false);
    });

    // === Chuyển câu hỏi ===
    // timeLimit do client gửi lên được bỏ qua: server tự tính theo cài đặt hẹn giờ của phiên.
    socket.on(SOCKET_EVENTS.NEXT_QUESTION, ({ sessionId, questionId }) => {
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

      const prev = activeSessions.get(sessionId);
      if (prev?.timerHandle) clearTimeout(prev.timerHandle);

      const session: ActiveSession = {
        sessionId,
        currentQuestionId: questionId,
        isLocked: false,
        answers: {},
        timeLimit: null,
        endsAt: null,
      };
      activeSessions.set(sessionId, session);
      startCountdown(session, effectiveTimeLimit(loadTimerSettings(sessionId), question));

      const totalQ = db.prepare(
        'SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?'
      ).get(question.quiz_id) as any;

      io.to(`session:${sessionId}`).emit(
        SOCKET_EVENTS.QUESTION_STARTED,
        questionStartedPayload(session, question, totalQ?.count || 0)
      );

      console.log(
        `▶️ Question started: Order ${question.question_order} in session ${sessionId} (${session.timeLimit ?? 'không giới hạn'}s)`
      );
    });

    // === Nhận kết quả quét (từ mobile camera hoặc web scanner) ===
    socket.on(SOCKET_EVENTS.SUBMIT_SCANNED_BATCH, ({ sessionId, records }) => {
      submitAnswers(sessionId, records);
    });

    // === Khóa câu hỏi (GV bấm Khóa; hết giờ thì server tự khóa) ===
    socket.on(SOCKET_EVENTS.LOCK_QUESTION, ({ sessionId }) => {
      lockQuestion(sessionId);
    });

    // === Đổi cài đặt hẹn giờ (từ máy chiếu hoặc điện thoại) ===
    // payload: { sessionId, timerEnabled?, timeLimitAll? (số | null để bỏ), questionId?, questionTime? (số | null để bỏ) }
    socket.on(SOCKET_EVENTS.UPDATE_TIMER_SETTINGS, (payload: any) => {
      try {
        const sessionId = String(payload?.sessionId || '');
        const db = getDB();
        const exists = db.prepare('SELECT id FROM exam_sessions WHERE id = ?').get(sessionId);
        if (!exists) throw new Error('Không tìm thấy phiên thi');

        const settings = loadTimerSettings(sessionId);
        const wasEnabled = settings.timerEnabled;

        if (typeof payload.timerEnabled === 'boolean') settings.timerEnabled = payload.timerEnabled;
        const all = parseTime(payload.timeLimitAll);
        if (all !== undefined) settings.timeLimitAll = all;
        if (payload.questionId) {
          const qTime = parseTime(payload.questionTime);
          if (qTime === null) delete settings.questionTimes[payload.questionId];
          else if (qTime !== undefined) settings.questionTimes[payload.questionId] = qTime;
        }

        db.prepare('UPDATE exam_sessions SET timer_enabled = ?, time_limit_all = ?, question_times = ? WHERE id = ?').run(
          settings.timerEnabled ? 1 : 0,
          settings.timeLimitAll,
          JSON.stringify(settings.questionTimes),
          sessionId
        );

        // Nếu thay đổi ảnh hưởng tới câu đang chạy (chưa khóa) thì đếm lại câu đó từ bây giờ với thời gian mới
        const session = activeSessions.get(sessionId);
        if (session?.currentQuestionId && !session.isLocked) {
          const question = db.prepare('SELECT id, time_limit FROM questions WHERE id = ?').get(session.currentQuestionId) as any;
          const touchedCurrent =
            wasEnabled !== settings.timerEnabled || // bật/tắt đếm giờ
            payload.questionId === session.currentQuestionId || // sửa thời gian của chính câu này
            (all !== undefined && settings.questionTimes[session.currentQuestionId] === undefined); // sửa thời gian chung và câu này đang dùng thời gian chung
          if (question && touchedCurrent) {
            startCountdown(session, effectiveTimeLimit(settings, question));
          }
        }

        io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.TIMER_SETTINGS, {
          settings,
          current: session?.currentQuestionId ? { questionId: session.currentQuestionId, ...timerState(session) } : null,
        });
      } catch (err: any) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: err?.message || 'Không cập nhật được cài đặt hẹn giờ' });
      }
    });

    // === Kết thúc phiên ===
    socket.on(SOCKET_EVENTS.END_SESSION, ({ sessionId }) => {
      const db = getDB();
      db.prepare("UPDATE exam_sessions SET status = 'COMPLETED' WHERE id = ?").run(sessionId);
      const session = activeSessions.get(sessionId);
      if (session?.timerHandle) clearTimeout(session.timerHandle);
      activeSessions.delete(sessionId);

      io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.SESSION_ENDED, { sessionId });
      console.log(`🏁 Session ended: ${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`👋 Client disconnected: ${socket.id}`);
    });
  });
}
