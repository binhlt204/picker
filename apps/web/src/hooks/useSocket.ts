'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@pickball/shared';
import type {
  QuestionStartedPayload,
  UpdateSubmittedPayload,
  QuestionLockedPayload,
  TimerSettings,
  TimerSettingsPayload,
  TimerState,
} from '@pickball/shared';

/** Đồng hồ câu hiện tại, kèm độ lệch giữa đồng hồ server và máy này (ms). */
export interface ClientTimer {
  timeLimit: number | null;
  endsAt: number | null;
  clockOffset: number; // serverNow - Date.now() lúc nhận
}

export type TimerSettingsPatch = {
  timerEnabled?: boolean;
  timeLimitAll?: number | null;
  questionId?: string;
  questionTime?: number | null;
};

function toClientTimer(t: TimerState): ClientTimer {
  return { timeLimit: t.timeLimit, endsAt: t.endsAt, clockOffset: t.serverNow - Date.now() };
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket(sessionId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionStartedPayload | null>(null);
  const [submittedCardIds, setSubmittedCardIds] = useState<number[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockData, setLockData] = useState<QuestionLockedPayload | null>(null);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [timer, setTimer] = useState<ClientTimer>({ timeLimit: null, endsAt: null, clockOffset: 0 });
  const [timerSettings, setTimerSettings] = useState<TimerSettings | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit(SOCKET_EVENTS.JOIN_AS_PROJECTOR, { sessionId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on(SOCKET_EVENTS.QUESTION_STARTED, (data: QuestionStartedPayload) => {
      setCurrentQuestion(data);
      setTimer(toClientTimer(data));
      setSubmittedCardIds([]);
      setIsLocked(false);
      setLockData(null);
    });

    socket.on(SOCKET_EVENTS.UPDATE_SUBMITTED_STUDENTS, (data: UpdateSubmittedPayload) => {
      setSubmittedCardIds(data.submittedCardIds);
      if (data.totalStudents > 0) {
        setTotalStudents(data.totalStudents);
      }
    });

    socket.on(SOCKET_EVENTS.QUESTION_LOCKED, (data: QuestionLockedPayload) => {
      setIsLocked(true);
      setTimer((t) => ({ ...t, endsAt: null }));
      setLockData(data);
    });

    // Cài đặt hẹn giờ thay đổi (từ máy chiếu hoặc điện thoại) -> cập nhật cả đồng hồ câu đang chạy
    socket.on(SOCKET_EVENTS.TIMER_SETTINGS, (data: TimerSettingsPayload) => {
      setTimerSettings(data.settings);
      if (data.current) setTimer(toClientTimer(data.current));
    });

    socket.on(SOCKET_EVENTS.ERROR, (data: { message?: string }) => {
      setSocketError(data?.message || 'Có lỗi xảy ra');
    });

    socket.on(SOCKET_EVENTS.SESSION_ENDED, () => {
      setIsSessionEnded(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const nextQuestion = useCallback(
    // Thời gian của câu do server tự tính theo cài đặt hẹn giờ của phiên
    (questionId: string) => {
      socketRef.current?.emit(SOCKET_EVENTS.NEXT_QUESTION, {
        sessionId,
        questionId,
      });
    },
    [sessionId]
  );

  const lockQuestion = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.LOCK_QUESTION, { sessionId });
  }, [sessionId]);

  const updateTimerSettings = useCallback(
    (patch: TimerSettingsPatch) => {
      setSocketError(null);
      socketRef.current?.emit(SOCKET_EVENTS.UPDATE_TIMER_SETTINGS, { sessionId, ...patch });
    },
    [sessionId]
  );

  const endSession = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.END_SESSION, { sessionId });
  }, [sessionId]);

  return {
    socket: socketRef.current,
    isConnected,
    currentQuestion,
    submittedCardIds,
    totalStudents,
    setTotalStudents,
    isLocked,
    lockData,
    isSessionEnded,
    nextQuestion,
    lockQuestion,
    endSession,
    timer,
    timerSettings,
    updateTimerSettings,
    socketError,
    clearSocketError: () => setSocketError(null),
  };
}
