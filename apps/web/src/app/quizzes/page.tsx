'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  FiFileText,
  FiPlus,
  FiTrash2,
  FiClock,
  FiCheckCircle,
  FiHelpCircle,
  FiX,
  FiChevronRight,
  FiPlay,
} from 'react-icons/fi';
import Link from 'next/link';

interface Question {
  id: string;
  quiz_id: string;
  question_order: number;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  time_limit: number;
}

interface Quiz {
  id: string;
  title: string;
  created_at: string;
  question_count?: number;
  questions?: Question[];
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');

  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [questionContent, setQuestionContent] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOpt, setCorrectOpt] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [timeLimit, setTimeLimit] = useState(30);

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    try {
      setLoading(true);
      const res = await api.get('/quizzes');
      setQuizzes(res.data);
      if (res.data.length > 0 && !selectedQuiz) {
        loadQuizDetails(res.data[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải đề thi:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuizDetails(id: string) {
    try {
      const res = await api.get(`/quizzes/${id}`);
      setSelectedQuiz(res.data);
    } catch (err) {
      console.error('Lỗi tải chi tiết đề:', err);
    }
  }

  async function handleCreateQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;

    try {
      setActionLoading(true);
      const res = await api.post('/quizzes', { title: newQuizTitle.trim() });
      setQuizzes([res.data, ...quizzes]);
      setSelectedQuiz(res.data);
      setNewQuizTitle('');
      setIsCreateQuizOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi tạo đề thi');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteQuiz(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa bộ đề này cùng các câu hỏi?')) return;
    try {
      await api.delete(`/quizzes/${id}`);
      const filtered = quizzes.filter((q) => q.id !== id);
      setQuizzes(filtered);
      if (selectedQuiz?.id === id) {
        setSelectedQuiz(filtered.length > 0 ? filtered[0] : null);
        if (filtered.length > 0) {
          loadQuizDetails(filtered[0].id);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi xóa đề');
    }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuiz) return;

    try {
      setActionLoading(true);
      await api.post(`/quizzes/${selectedQuiz.id}/questions`, {
        content: questionContent.trim(),
        option_a: optA.trim(),
        option_b: optB.trim(),
        option_c: optC.trim(),
        option_d: optD.trim(),
        correct_option: correctOpt,
        time_limit: timeLimit,
      });

      loadQuizDetails(selectedQuiz.id);
      setQuestionContent('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setCorrectOpt('A');
      setTimeLimit(30);
      setIsAddQuestionOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi tạo câu hỏi');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteQuestion(qId: string) {
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
      await api.delete(`/questions/${qId}`);
      if (selectedQuiz) {
        loadQuizDetails(selectedQuiz.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi xóa câu hỏi');
    }
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FiFileText className="text-amber-500" />
            <span>Ngân Hàng Đề Thi & Soạn Câu Hỏi</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Không giới hạn số lượng câu hỏi • Tùy chỉnh thời gian trả lời riêng cho từng câu
          </p>
        </div>

        <button
          onClick={() => setIsCreateQuizOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition active:scale-95 self-start sm:self-auto"
        >
          <FiPlus />
          <span>Tạo Đề Mới</span>
        </button>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quizzes List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider px-1">
            Danh Sách Bộ Đề ({quizzes.length})
          </h3>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Đang tải đề thi...</div>
          ) : quizzes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
              <p className="text-sm text-slate-400 mb-3">Chưa có đề thi nào.</p>
              <button
                onClick={() => setIsCreateQuizOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-xs font-bold text-white inline-flex items-center gap-1.5"
              >
                <FiPlus /> Tạo ngay
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {quizzes.map((q) => {
                const isSelected = selectedQuiz?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => loadQuizDetails(q.id)}
                    className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-600/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <h4 className={`text-base font-bold ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                        {q.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {q.question_count ?? q.questions?.length ?? 0} câu hỏi • Tạo ngày{' '}
                        {q.created_at ? new Date(q.created_at).toLocaleDateString('vi-VN') : '—'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuiz(q.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      title="Xóa đề"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Questions list for selected quiz (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between min-h-[500px]">
          {selectedQuiz ? (
            <div>
              {/* Quiz Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{selectedQuiz.title}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                      {selectedQuiz.questions?.length || 0} câu hỏi
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Soạn các câu trắc nghiệm 4 lựa chọn (A, B, C, D)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddQuestionOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-md shadow-amber-600/20"
                  >
                    <FiPlus />
                    <span>Thêm Câu Hỏi</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {!selectedQuiz.questions || selectedQuiz.questions.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-3">
                    <FiHelpCircle />
                  </div>
                  <h4 className="text-base font-bold text-slate-200 mb-1">Đề chưa có câu hỏi nào</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Thêm các câu hỏi trắc nghiệm kèm 4 lựa chọn A-B-C-D và chỉ định đáp án đúng.
                  </p>
                  <button
                    onClick={() => setIsAddQuestionOpen(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-2"
                  >
                    <FiPlus /> Thêm câu hỏi đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                  {selectedQuiz.questions.map((q) => (
                    <div
                      key={q.id}
                      className="group p-5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {q.question_order}
                          </span>
                          <h4 className="text-base font-bold text-slate-100 leading-snug">
                            {q.content}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                            <FiClock className="text-amber-400" />
                            {q.time_limit}s
                          </span>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                            title="Xóa câu hỏi"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      </div>

                      {/* 4 Option previews */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {[
                          { key: 'A', text: q.option_a, color: 'text-blue-400' },
                          { key: 'B', text: q.option_b, color: 'text-amber-400' },
                          { key: 'C', text: q.option_c, color: 'text-rose-400' },
                          { key: 'D', text: q.option_d, color: 'text-emerald-400' },
                        ].map(({ key, text, color }) => {
                          const isCorrect = q.correct_option === key;
                          return (
                            <div
                              key={key}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-semibold'
                                  : 'bg-slate-900/50 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={`font-black ${color}`}>{key}.</span>
                                <span className="truncate">{text}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold">
                                  ĐÚNG
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="m-auto text-center py-20 text-slate-400">
              Chọn hoặc tạo một bộ đề ở cột bên trái để soạn câu hỏi.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Quiz */}
      {isCreateQuizOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Tạo Bộ Đề Mới</h3>
              <button onClick={() => setIsCreateQuizOpen(false)} className="text-slate-400 hover:text-white">
                <FiX className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Tiêu đề đề thi
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kiểm tra 15 phút Toán học..."
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateQuizOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newQuizTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {actionLoading ? 'Đang tạo...' : 'Tạo Đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Question */}
      {isAddQuestionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Thêm Câu Hỏi Mới</h3>
              <button onClick={() => setIsAddQuestionOpen(false)} className="text-slate-400 hover:text-white">
                <FiX className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nội dung câu hỏi
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
              </div>

              {/* 4 Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-1">Lựa chọn A</label>
                  <input
                    type="text"
                    placeholder="Nội dung đáp án A..."
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">Lựa chọn B</label>
                  <input
                    type="text"
                    placeholder="Nội dung đáp án B..."
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-400 mb-1">Lựa chọn C</label>
                  <input
                    type="text"
                    placeholder="Nội dung đáp án C..."
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">Lựa chọn D</label>
                  <input
                    type="text"
                    placeholder="Nội dung đáp án D..."
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Correct Option & Time Limit */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Đáp án đúng
                  </label>
                  <div className="flex gap-2">
                    {(['A', 'B', 'C', 'D'] as const).map((key) => (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setCorrectOpt(key)}
                        className={`flex-1 py-2 rounded-xl font-bold text-sm border transition ${
                          correctOpt === key
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Thời gian (giây)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu Câu Hỏi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
