'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@pickball/shared';
import type {
  QuestionStartedPayload,
  UpdateSubmittedPayload,
  QuestionLockedPayload,
} from '@pickball/shared';

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
      setLockData(data);
    });

    socket.on(SOCKET_EVENTS.SESSION_ENDED, () => {
      setIsSessionEnded(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const nextQuestion = useCallback(
    (questionId: string, timeLimit: number) => {
      socketRef.current?.emit(SOCKET_EVENTS.NEXT_QUESTION, {
        sessionId,
        questionId,
        timeLimit,
      });
    },
    [sessionId]
  );

  const lockQuestion = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.LOCK_QUESTION, { sessionId });
  }, [sessionId]);

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
  };
}
