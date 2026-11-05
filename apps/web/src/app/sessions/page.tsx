'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  FiPlayCircle,
  FiPlus,
  FiMonitor,
  FiAward,
  FiUsers,
} from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

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

        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="self-start sm:self-auto">
          <FiPlus />
          <span>Tạo Phiên Mới</span>
        </Button>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">Đang tải danh sách phiên thi...</div>
      ) : sessions.length === 0 ? (
        <Card padding="lg" className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center text-3xl mx-auto mb-4">
            <FiPlayCircle />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Chưa có phiên kiểm tra nào</h3>
          <p className="text-xs text-slate-400 mb-6">
            Chọn lớp học và bộ đề thi tương ứng để bắt đầu phiên làm bài trên máy chiếu.
          </p>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <FiPlus /> Tạo phiên ngay
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const isCompleted = session.status === 'COMPLETED';
            return (
              <Card key={session.id} padding="lg" className="hover:border-slate-700/80 flex flex-col justify-between transition-colors space-y-6">
                <div>
                  {/* Status badge & time */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge tone={isCompleted ? 'neutral' : 'success'} className={isCompleted ? '' : 'animate-pulse'}>
                      {isCompleted ? 'Đã hoàn thành' : 'Đang hoạt động'}
                    </Badge>
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
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs">
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
                  <Link href={`/sessions/projector/${session.id}`}>
                    <Button className="w-full">
                      <FiMonitor />
                      <span>Máy Chiếu</span>
                    </Button>
                  </Link>

                  <Link href={`/results/${session.id}`}>
                    <Button variant="secondary" className="w-full">
                      <FiAward />
                      <span>Xem Điểm</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Create Session */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Tạo Phiên Kiểm Tra Mới">
        <form onSubmit={handleCreateSession} className="space-y-4">
          {/* Select Classroom */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Chọn Lớp Học</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Chọn Bộ Đề Thi</label>
            <select
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
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
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading || !selectedClassId || !selectedQuizId}>
              {actionLoading ? 'Đang tạo...' : 'Bắt Đầu Phiên'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
