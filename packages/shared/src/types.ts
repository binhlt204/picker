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
  current_question_order: number;
  created_at: string;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  student_id: string;
  selected_option: 'A' | 'B' | 'C' | 'D';
  is_correct: number;    // 1 or 0
  submitted_at: string;
}

// ===== SOCKET EVENTS PAYLOAD =====
export interface ScanRecord {
  cardId: number;
  answer: 'A' | 'B' | 'C' | 'D';
}

export interface QuestionStartedPayload extends TimerState {
  questionId: string;
  questionOrder: number;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: 'A' | 'B' | 'C' | 'D'; // chỉ dùng cho điện thoại GV
  totalQuestions: number;
}

/** Cài đặt hẹn giờ của 1 phiên thi. */
export interface TimerSettings {
  timerEnabled: boolean; // false = không giới hạn thời gian cho cả phiên
  timeLimitAll: number | null; // giây, áp dụng cho tất cả câu; null = dùng thời gian riêng từng câu
  questionTimes: Record<string, number>; // questionId -> giây (0 = không giới hạn cho câu đó)
}

/** Trạng thái đồng hồ của câu đang chạy (server là nguồn thời gian chuẩn). */
export interface TimerState {
  timeLimit: number | null; // tổng số giây của câu hiện tại; null = không giới hạn
  endsAt: number | null; // thời điểm hết giờ (ms, theo đồng hồ server); null = không đếm giờ
  serverNow: number; // giờ server lúc gửi (ms) để client bù chênh lệch đồng hồ
}

export interface TimerSettingsPayload {
  settings: TimerSettings;
  current: (TimerState & { questionId: string }) | null;
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
