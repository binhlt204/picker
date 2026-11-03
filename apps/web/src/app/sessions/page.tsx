'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  FiPlayCircle,
  FiPlus,
  FiMonitor,
  FiAward,
  FiClock,
  FiCheckCircle,
  FiX,
  FiUsers,
  FiFileText,
} from 'react-icons/fi';

interface ExamSession {
  id: string;
  classroom_id: string;
  quiz_id: string;
  classroom_name: string;
  quiz_title: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  current_question_order: number;
  total_students?: number;
  total_questions?: number;
  created_at: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [sessionsRes, classesRes, quizzesRes] = await Promise.all([
        api.get('/sessions'),
        api.get('/classrooms'),
        api.get('/quizzes'),
      ]);
      setSessions(sessionsRes.data);
      setClassrooms(classesRes.data);
      setQuizzes(quizzesRes.data);

      if (classesRes.data.length > 0) setSelectedClassId(classesRes.data[0].id);
      if (quizzesRes.data.length > 0) setSelectedQuizId(quizzesRes.data[0].id);
    } catch (err) {
      console.error('Lỗi tải dữ liệu phiên thi:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId || !selectedQuizId) return;

    try {
      setActionLoading(true);
      const res = await api.post('/sessions', {
        classroom_id: selectedClassId,
        quiz_id: selectedQuizId,
      });

      setSessions([res.data, ...sessions]);
      setIsCreateOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi tạo phiên');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FiPlayCircle className="text-blue-500" />
            <span>Các Phiên Kiểm Tra Trực Tiếp</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kết nối máy chiếu phòng học và đồng bộ quét camera từ ứng dụng điện thoại
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95 self-start sm:self-auto"
        >
          <FiPlus />
          <span>Tạo Phiên Mới</span>
        </button>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">Đang tải danh sách phiên thi...</div>
      ) : sessions.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-900/40 border border-slate-800 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-3xl mx-auto mb-4">
            <FiPlayCircle />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Chưa có phiên kiểm tra nào</h3>
          <p className="text-xs text-slate-400 mb-6">
            Chọn lớp học và bộ đề thi tương ứng để bắt đầu phiên làm bài trên máy chiếu.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white inline-flex items-center gap-2"
          >
            <FiPlus /> Tạo phiên ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const isCompleted = session.status === 'COMPLETED';
            return (
              <div
                key={session.id}
                className="rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 p-6 flex flex-col justify-between transition-all duration-300 shadow-xl space-y-6"
              >
                <div>
                  {/* Status badge & time */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isCompleted
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                      }`}
                    >
                      {isCompleted ? 'Đã hoàn thành' : 'Đang hoạt động'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {session.created_at ? new Date(session.created_at).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>

                  {/* Quiz title */}
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                    {session.quiz_title}
                  </h3>

                  {/* Classroom name */}
                  <div className="flex items-center gap-2 text-xs text-slate-300 mb-4">
                    <FiUsers className="text-blue-400" />
                    <span>Lớp: <strong className="text-white">{session.classroom_name}</strong></span>
                  </div>

                  {/* Meta stats */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Học sinh</span>
                      <span className="text-sm font-black text-white font-mono">{session.total_students || 0} HS</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Câu hỏi</span>
                      <span className="text-sm font-black text-white font-mono">{session.total_questions || 0} câu</span>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <Link
                    href={`/sessions/projector/${session.id}`}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/20"
                  >
                    <FiMonitor />
                    <span>Máy Chiếu</span>
                  </Link>

                  <Link
                    href={`/results/${session.id}`}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
                  >
                    <FiAward className="text-amber-400" />
                    <span>Xem Điểm</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Session */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Tạo Phiên Kiểm Tra Mới</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <FiX className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-4">
              {/* Select Classroom */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  1. Chọn Lớp Học
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Quiz */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  2. Chọn Bộ Đề Thi
                </label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.question_count || 0} câu)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedClassId || !selectedQuizId}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {actionLoading ? 'Đang tạo...' : 'Bắt Đầu Phiên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
