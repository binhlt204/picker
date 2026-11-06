// Socket.io event names — dùng chung giữa client/server/mobile
export const SOCKET_EVENTS = {
  // Connection
  JOIN_AS_PROJECTOR: 'join_as_projector',
  JOIN_AS_SCANNER: 'join_as_scanner',

  // Session control (Teacher → All)
  START_SESSION: 'start_session',
  NEXT_QUESTION: 'next_question',
  LOCK_QUESTION: 'lock_question',
  UNLOCK_QUESTION: 'unlock_question', // mở khóa lại câu đã khóa (giữ nguyên các bài đã nộp)
  END_SESSION: 'end_session',

  // Question flow (Server → All)
  QUESTION_STARTED: 'question_started',
  QUESTION_LOCKED: 'question_locked',
  QUESTION_UNLOCKED: 'question_unlocked', // câu được mở khóa lại, kèm đồng hồ mới
  SESSION_ENDED: 'session_ended',

  // Scanning (Mobile → Server → Projector)
  SUBMIT_SCANNED_BATCH: 'submit_scanned_batch',
  UPDATE_SUBMITTED_STUDENTS: 'update_submitted_students',

  // Hẹn giờ (đồng bộ máy chiếu + điện thoại; server giữ đồng hồ và tự khóa khi hết giờ)
  UPDATE_TIMER_SETTINGS: 'update_timer_settings', // Client -> Server: đổi cài đặt hẹn giờ
  TIMER_SETTINGS: 'timer_settings', // Server -> All: cài đặt mới + trạng thái đồng hồ câu hiện tại

  // Errors
  ERROR: 'error',
} as const;

export const ANSWER_OPTIONS = ['A', 'B', 'C', 'D'] as const;
export const MAX_CARDS = 50;
export const DEFAULT_TIME_LIMIT = 30; // giây
