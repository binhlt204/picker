'use client';

import React from 'react';

interface CountdownTimerProps {
  timeLeft: number | null; // null = không giới hạn thời gian
  total: number | null;
  isWarning: boolean;
}

export function CountdownTimer({ timeLeft, total, isWarning }: CountdownTimerProps) {
  // Câu không giới hạn thời gian: hiện biểu tượng vô cực thay cho vòng đếm ngược
  if (timeLeft === null || total === null) {
    return (
      <div className="w-24 h-24 rounded-full border-[6px] border-slate-800 flex flex-col items-center justify-center" title="Không giới hạn thời gian">
        <span className="text-3xl font-bold text-sky-400 leading-none">∞</span>
        <span className="text-[8px] uppercase font-bold leading-tight text-center text-slate-400 mt-1">
          Không
          <br />
          giới hạn
        </span>
      </div>
    );
  }

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, Math.min(1, timeLeft / total)) : 0;
  const strokeDashoffset = circumference - progress * circumference;

  let colorClass = 'text-emerald-500';
  let strokeColor = '#10B981';

  if (timeLeft <= 0) {
    colorClass = 'text-rose-500';
    strokeColor = '#EF4444';
  } else if (isWarning) {
    colorClass = 'text-amber-500 animate-pulse';
    strokeColor = '#F59E0B';
  }

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
        {/* Background track */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="text-slate-800"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
        />
        {/* Animated countdown ring */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold font-mono tracking-tight ${colorClass}`}>
          {timeLeft}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">giây</span>
      </div>
    </div>
  );
}
