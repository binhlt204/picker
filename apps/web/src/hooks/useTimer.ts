'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(initialTime: number, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const reset = useCallback((newTime: number) => {
    setTimeLeft(newTime);
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    if (timeLeft <= 0) {
      setIsRunning(false);
      onExpireRef.current();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isRunning]);

  return {
    timeLeft,
    isRunning,
    isWarning: timeLeft <= 5 && timeLeft > 0,
    isDanger: timeLeft <= 0,
    progress: initialTime > 0 ? Math.max(0, timeLeft / initialTime) : 0,
    reset,
    stop,
  };
}
