'use client';

import React from 'react';

interface StudentGridProps {
  totalStudents: number;
  submittedCardIds: number[];
  isLocked: boolean;
  finalAnswers?: Record<number, string>;
  correctOption?: string;
  studentsList?: Array<{ card_id: number; full_name: string }>;
}

export function StudentGrid({
  totalStudents,
  submittedCardIds,
  isLocked,
  finalAnswers,
  correctOption,
  studentsList = [],
}: StudentGridProps) {
  const count = Math.max(totalStudents, studentsList.length, 1);
  const submittedSet = new Set(submittedCardIds);

  // Build items 1..count
  const cards = Array.from({ length: count }, (_, i) => {
    const cardId = i + 1;
    const student = studentsList.find((s) => s.card_id === cardId);
    return {
      cardId,
      name: student ? student.full_name : `Thẻ #${cardId.toString().padStart(2, '0')}`,
      isSubmitted: submittedSet.has(cardId),
      answer: finalAnswers ? finalAnswers[cardId] : undefined,
    };
  });

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800">
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-[190px] overflow-y-auto pr-1">
        {cards.map(({ cardId, name, isSubmitted, answer }) => {
          let badgeStyle = 'bg-slate-800/60 text-slate-400 border-slate-700/60';

          if (isLocked && answer) {
            const isCorrect = answer === correctOption;
            if (isCorrect) {
              badgeStyle = 'bg-emerald-600/30 text-emerald-300 border-emerald-500/70 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
            } else {
              badgeStyle = 'bg-rose-600/30 text-rose-300 border-rose-500/70';
            }
          } else if (isSubmitted) {
            badgeStyle = 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105';
          }

          return (
            <div
              key={cardId}
              title={`${name}${answer ? ` (Chọn: ${answer})` : ''}`}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-300 cursor-default select-none ${badgeStyle}`}
            >
              <span className="text-xs font-mono font-bold tracking-tight">
                #{cardId.toString().padStart(2, '0')}
              </span>
              <div className="text-[11px] font-semibold mt-0.5 truncate w-full px-0.5">
                {isLocked && answer ? (
                  <span>{answer}</span>
                ) : isSubmitted ? (
                  <span>✓</span>
                ) : (
                  <span className="text-slate-500 text-[10px]">•</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
