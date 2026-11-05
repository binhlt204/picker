'use client';

import React from 'react';

interface ResultChartProps {
  distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
  totalSubmitted: number;
}

export function ResultChart({ distribution, correctOption, totalSubmitted }: ResultChartProps) {
  const correctCount = distribution[correctOption] || 0;
  const incorrectCount = Math.max(0, totalSubmitted - correctCount);
  const accuracyPct = totalSubmitted > 0 ? Math.round((correctCount / totalSubmitted) * 100) : 0;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 my-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Overall Accuracy */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {accuracyPct}%
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Tỷ lệ trả lời đúng</h4>
            <p className="text-xs text-slate-400">Đáp án chuẩn: <span className="font-bold text-emerald-400 text-sm">Câu {correctOption}</span></p>
          </div>
        </div>

        {/* Right: Quick stats badges */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-center">
            <div className="text-xs text-slate-400 font-medium">Đã nộp</div>
            <div className="text-lg font-black text-white font-mono">{totalSubmitted}</div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-center">
            <div className="text-xs text-emerald-400 font-medium">Lựa chọn đúng</div>
            <div className="text-lg font-black text-emerald-400 font-mono">{correctCount}</div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-center">
            <div className="text-xs text-rose-400 font-medium">Lựa chọn sai</div>
            <div className="text-lg font-black text-rose-400 font-mono">{incorrectCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
