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
