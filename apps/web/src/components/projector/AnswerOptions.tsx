'use client';

import React from 'react';

interface AnswerOptionsProps {
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption?: 'A' | 'B' | 'C' | 'D';
  distribution?: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

const OPTION_CONFIG = {
  A: {
    badgeBg: 'bg-blue-600',
    borderDefault: 'border-blue-500/30',
    bgDefault: 'bg-blue-950/20 hover:bg-blue-900/30',
    textAccent: 'text-blue-400',
    barColor: 'bg-blue-500',
  },
  B: {
    badgeBg: 'bg-amber-600',
    borderDefault: 'border-amber-500/30',
    bgDefault: 'bg-amber-950/20 hover:bg-amber-900/30',
    textAccent: 'text-amber-400',
    barColor: 'bg-amber-500',
  },
  C: {
    badgeBg: 'bg-rose-600',
    borderDefault: 'border-rose-500/30',
    bgDefault: 'bg-rose-950/20 hover:bg-rose-900/30',
    textAccent: 'text-rose-400',
    barColor: 'bg-rose-500',
  },
  D: {
    badgeBg: 'bg-emerald-600',
    borderDefault: 'border-emerald-500/30',
    bgDefault: 'bg-emerald-950/20 hover:bg-emerald-900/30',
    textAccent: 'text-emerald-400',
    barColor: 'bg-emerald-500',
  },
} as const;

export function AnswerOptions({ options, correctOption, distribution }: AnswerOptionsProps) {
  const keys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  const totalVotes = distribution
    ? distribution.A + distribution.B + distribution.C + distribution.D
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
      {keys.map((key) => {
        const config = OPTION_CONFIG[key];
        const isCorrect = correctOption === key;
        const count = distribution ? distribution[key] : 0;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

        let cardBorder: string = config.borderDefault;
        let cardBg: string = config.bgDefault;

        if (correctOption) {
          if (isCorrect) {
            cardBorder = 'border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]';
            cardBg = 'bg-emerald-950/40 ring-2 ring-emerald-500/50';
          } else {
            cardBorder = 'border-slate-800 opacity-60';
            cardBg = 'bg-slate-900/40';
          }
        }

        return (
          <div
            key={key}
            className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 ${cardBorder} ${cardBg} backdrop-blur-sm flex flex-col justify-between min-h-[110px]`}
          >
            {/* Top row: Badge + Text */}
            <div className="flex items-start gap-4">
              <span
                className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-md ${config.badgeBg}`}
              >
                {key}
              </span>
              <p className="text-xl md:text-2xl font-medium text-slate-100 leading-snug flex-1">
                {options[key]}
              </p>
              {isCorrect && (
                <span className="flex-shrink-0 px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-sm rounded-full flex items-center gap-1 shadow-md animate-bounce">
                  ✓ ĐÚNG
                </span>
              )}
            </div>

            {/* Distribution bar (shown when locked) */}
            {distribution && (
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <div className="flex justify-between items-center text-sm font-semibold mb-1.5">
                  <span className="text-slate-400">{count} học sinh</span>
                  <span className={`text-base font-bold ${isCorrect ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isCorrect ? 'bg-emerald-500' : config.barColor
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
