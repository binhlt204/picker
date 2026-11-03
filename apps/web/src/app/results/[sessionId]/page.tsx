'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  FiAward,
  FiDownload,
  FiArrowLeft,
  FiCheck,
  FiX,
  FiUsers,
  FiBarChart2,
  FiCheckCircle,
  FiAlertTriangle,
} from 'react-icons/fi';
import Link from 'next/link';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true);
        const res = await api.get(`/sessions/${sessionId}/results`);
        setData(res.data);
      } catch (err) {
        console.error('Lỗi tải kết quả:', err);
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      fetchResults();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>Đang tổng hợp bảng điểm và thống kê...</p>
      </div>
    );
  }

  if (!data || !data.session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Không tìm thấy kết quả phiên</h3>
        <Link href="/sessions" className="text-blue-400 hover:underline text-sm">
          Quay lại danh sách phiên
        </Link>
      </div>
    );
  }

  const { session, questions = [], students = [], summary = {} } = data;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <button
            onClick={() => router.push('/sessions')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-2 transition"
          >
            <FiArrowLeft /> Quay lại danh sách phiên
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FiAward className="text-amber-400" />
            <span>Kết Quả: {session.quiz_title}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Lớp: <span className="text-slate-200 font-bold">{session.classroom_name}</span> • Ngày thi:{' '}
            {session.created_at ? new Date(session.created_at).toLocaleDateString('vi-VN') : ''}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <a
            href={`http://localhost:3001/api/sessions/${sessionId}/results/export?format=csv`}
            download
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm"
          >
            <FiDownload /> Xuất CSV
          </a>
          <a
            href={`http://localhost:3001/api/sessions/${sessionId}/results/export?format=xlsx`}
            download
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition active:scale-95"
          >
            <FiDownload /> Xuất Excel (.xlsx)
          </a>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Học sinh</span>
          <div className="text-2xl font-black text-white font-mono mt-1">{summary.totalStudents || 0}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Điểm trung bình</span>
          <div className="text-2xl font-black text-blue-400 font-mono mt-1">{summary.avgScore || 0}/10</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Tỷ lệ đúng TB</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{summary.avgRate || 0}%</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Điểm cao nhất</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{summary.maxScore || 0}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Điểm thấp nhất</span>
          <div className="text-2xl font-black text-rose-400 font-mono mt-1">{summary.minScore || 0}</div>
        </div>
      </div>

      {/* Detailed Scoreboard Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Bảng Điểm Chi Tiết Từng Học Sinh</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {students.length} học sinh
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-3 px-3 w-16 text-center">Hạng</th>
                <th className="py-3 px-3 w-20 text-center">Thẻ #</th>
                <th className="py-3 px-4 min-w-[180px]">Họ và Tên</th>
                {questions.map((q: any) => (
                  <th key={q.id} className="py-3 px-2 text-center w-14">
                    C{q.question_order}
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-28">Đúng/Tổng</th>
                <th className="py-3 px-3 text-center w-28 text-white">Điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {students.map((student: any) => (
                <tr key={student.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        student.rank === 1
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : student.rank === 2
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : student.rank === 3
                          ? 'bg-amber-700 text-white font-black'
                          : 'text-slate-400'
                      }`}
                    >
                      {student.rank}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-blue-400 text-xs">
                    #{student.card_id.toString().padStart(2, '0')}
                  </td>
                  <td className="py-3 px-4 text-white font-semibold">{student.full_name}</td>

                  {/* Question Results */}
                  {questions.map((q: any) => {
                    const ans = student.answers[q.id];
                    if (!ans) {
                      return (
                        <td key={q.id} className="py-3 px-2 text-center text-slate-600 text-xs">
                          —
                        </td>
                      );
                    }
                    return (
                      <td key={q.id} className="py-3 px-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                            ans.isCorrect
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                          title={`Chọn: ${ans.selected}`}
                        >
                          {ans.selected}
                        </span>
                      </td>
                    );
                  })}

                  <td className="py-3 px-3 text-center font-mono text-xs">
                    <span className="font-bold text-white">{student.correctCount}</span>/{student.totalQuestions}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-base text-emerald-400">
                    {student.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
