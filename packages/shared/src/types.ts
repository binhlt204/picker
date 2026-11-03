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
