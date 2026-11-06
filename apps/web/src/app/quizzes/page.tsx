'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  FiFileText,
  FiPlus,
  FiTrash2,
  FiClock,
  FiHelpCircle,
  FiChevronRight,
  FiCheck,
} from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { ANSWER_KEYS, OPTION_CONFIG } from '@/lib/answerOptions';

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

  const [isBulkWordOpen, setIsBulkWordOpen] = useState(false);
  const [bulkWordText, setBulkWordText] = useState('');
  const [bulkStep, setBulkStep] = useState<'input' | 'preview'>('input');
  const [parsedQuestions, setParsedQuestions] = useState<Array<{
    order: number;
    content: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    time_limit: number;
  }>>([]);

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

  function parseQuestionsFromWord(rawText: string) {
    // 1. Tách phần câu hỏi và phần bảng đáp án ở cuối (nếu có)
    const lower = rawText.toLowerCase();
    const splitMatch = lower.search(/\n\s*(?:đáp\s*án\s*và\s*lời\s*giải|bảng\s*đáp\s*án|đáp\s*án\s*chi\s*tiết|hướng\s*dẫn\s*chấm|đáp\s*án)\b/);

    let qSection = rawText;
    let ansSection = '';
    if (splitMatch !== -1) {
      qSection = rawText.slice(0, splitMatch);
      ansSection = rawText.slice(splitMatch);
    }

    // 2. Trích xuất bảng đáp án từ ansSection (hoặc toàn bộ text)
    const ansMap: Record<number, string> = {};
    const targetAnsText = ansSection || rawText;
    const linesAns = targetAnsText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    // Bảng 2 dòng: Câu 1 2 3... / Đáp án C B D...
    for (let i = 0; i < linesAns.length - 1; i++) {
      const l1 = linesAns[i];
      const l2 = linesAns[i + 1];
      if (/^câu/i.test(l1) && /^đáp\s*án/i.test(l2)) {
        const nums = l1
          .replace(/^câu/i, '')
          .trim()
          .split(/[\t\s]+/)
          .map(Number)
          .filter((n) => !isNaN(n));
        const anss = l2
          .replace(/^đáp\s*án/i, '')
          .trim()
          .split(/[\t\s]+/)
          .map((a) => a.toUpperCase())
          .filter((a) => ['A', 'B', 'C', 'D'].includes(a));

        if (nums.length > 0 && nums.length === anss.length) {
          for (let k = 0; k < nums.length; k++) {
            ansMap[nums[k]] = anss[k];
          }
        }
      }
    }

    // Dạng inline: 1.C 2.B 3.D hoặc 1-C 2-B 3-D hoặc Câu 1: C...
    if (Object.keys(ansMap).length === 0) {
      const inlineRegex = /(?:câu\s*)?(\d+)[\s.:\-=]*([A-D])\b/gi;
      let match;
      while ((match = inlineRegex.exec(targetAnsText)) !== null) {
        const qNum = parseInt(match[1], 10);
        const ans = match[2].toUpperCase();
        if (qNum > 0 && qNum <= 200) {
          ansMap[qNum] = ans;
        }
      }
    }

    // 3. Phân tích các câu hỏi từ qSection
    const lines = qSection.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const questions: Array<{
      order: number;
      content: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_option: string;
      time_limit: number;
    }> = [];

    let currentQ: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Bắt đầu câu hỏi mới: "Câu 1:", "Câu 1.", "1.", "1/", "Question 1:"
      const qMatch = line.match(/^(?:Câu\s*(\d+)[\s.:\-\/]+|(\d+)[\s.:\-\/]+|Question\s*(\d+)[\s.:\-\/]+)(.+)$/i);
      if (qMatch) {
        if (currentQ && currentQ.content && currentQ.option_a && currentQ.option_b) {
          questions.push(currentQ);
        }
        const qOrder = parseInt(qMatch[1] || qMatch[2] || qMatch[3] || String(questions.length + 1), 10);
        currentQ = {
          order: qOrder,
          content: qMatch[4].trim(),
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_option: ansMap[qOrder] || 'A',
          time_limit: 30,
        };
        continue;
      }

      if (!currentQ) continue;

      // Đáp án inline dưới câu (nếu có): "Đáp án: A", "Đ/A: B", "Key: C", "Answer: D"
      const ansMatch = line.match(/^(?:Đáp\s*án|Đ\/A|ĐA|Answer|Key)[\s.:=]+([A-D])/i);
      if (ansMatch && !ansMap[currentQ.order]) {
        currentQ.correct_option = ansMatch[1].toUpperCase();
        continue;
      }

      // Các lựa chọn A, B, C, D (hoặc có hoa thị *A.)
      const optMatch = line.match(/^(\*)?\s*([A-D])[\s.:\)\/]+(.+)$/i);
      if (optMatch) {
        const isStarred = optMatch[1] === '*';
        const letter = optMatch[2].toUpperCase();
        const text = optMatch[3].trim();

        if (letter === 'A') currentQ.option_a = text;
        else if (letter === 'B') currentQ.option_b = text;
        else if (letter === 'C') currentQ.option_c = text;
        else if (letter === 'D') currentQ.option_d = text;

        if (isStarred && !ansMap[currentQ.order]) {
          currentQ.correct_option = letter;
        }
        continue;
      }

      if (!currentQ.option_a && !currentQ.option_b) {
        currentQ.content += ' ' + line;
      }
    }

    if (currentQ && currentQ.content && currentQ.option_a && currentQ.option_b) {
      questions.push(currentQ);
    }

    // Ánh xạ lại đáp án từ ansMap theo số thứ tự nếu có
    questions.forEach((q, idx) => {
      const orderNum = idx + 1;
      if (ansMap[q.order]) {
        q.correct_option = ansMap[q.order];
      } else if (ansMap[orderNum]) {
        q.correct_option = ansMap[orderNum];
      }
    });

    return questions;
  }

  function handleAnalyzeWord() {
    if (!bulkWordText.trim()) return;
    const parsed = parseQuestionsFromWord(bulkWordText);
    if (parsed.length === 0) {
      alert('Không nhận diện được câu hỏi nào. Vui lòng kiểm tra lại cấu trúc văn bản: Câu 1: ..., A. ..., B. ..., C. ..., D. ...');
      return;
    }
    setParsedQuestions(parsed);
    setBulkStep('preview');
  }

  async function handleSaveBulkQuestions() {
    if (!selectedQuiz || parsedQuestions.length === 0) return;

    try {
      setActionLoading(true);
      await api.post(`/quizzes/${selectedQuiz.id}/questions/bulk`, {
        questions: parsedQuestions,
      });
      loadQuizDetails(selectedQuiz.id);
      setBulkWordText('');
      setParsedQuestions([]);
      setBulkStep('input');
      setIsBulkWordOpen(false);
      alert(`Đã lưu thành công ${parsedQuestions.length} câu hỏi vào đề!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi lưu câu hỏi');
    } finally {
      setActionLoading(false);
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
      <PageHeader
        icon={<FiFileText />}
        title="Ngân hàng đề thi"
        description="Soạn câu hỏi không giới hạn, tùy chỉnh thời gian trả lời riêng cho từng câu"
        actions={
          <Button size="sm" onClick={() => setIsCreateQuizOpen(true)}>
            <FiPlus />
            <span>Tạo đề mới</span>
          </Button>
        }
      />

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quizzes List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs uppercase font-semibold text-slate-500 tracking-wide px-1">
            Danh Sách Bộ Đề ({quizzes.length})
          </h3>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Đang tải đề thi...</div>
          ) : quizzes.length === 0 ? (
            <Card padding="md" className="text-center">
              <p className="text-sm text-slate-400 mb-3">Chưa có đề thi nào.</p>
              <Button size="sm" onClick={() => setIsCreateQuizOpen(true)}>
                <FiPlus /> Tạo ngay
              </Button>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {quizzes.map((q) => {
                const isSelected = selectedQuiz?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => loadQuizDetails(q.id)}
                    className={`group p-3.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <h4 className={`text-sm sm:text-base font-semibold truncate ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                        {q.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {q.question_count ?? q.questions?.length ?? 0} câu hỏi • Tạo ngày{' '}
                        {q.created_at ? new Date(q.created_at).toLocaleDateString('vi-VN') : '—'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuiz(q.id);
                      }}
                      className="shrink-0 lg:opacity-0 lg:group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
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
        <Card padding="lg" className="lg:col-span-8 flex flex-col justify-between min-h-[500px]">
          {selectedQuiz ? (
            <div>
              {/* Quiz Header Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-100 flex flex-wrap items-center gap-2 break-words min-w-0">
                    <span>{selectedQuiz.title}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                      {selectedQuiz.questions?.length || 0} câu hỏi
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Soạn các câu trắc nghiệm 4 lựa chọn (A, B, C, D)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsBulkWordOpen(true)}>
                    <FiFileText />
                    <span>Nhập Đề Từ Word</span>
                  </Button>
                  <Button size="sm" onClick={() => setIsAddQuestionOpen(true)}>
                    <FiPlus />
                    <span>Thêm Câu Hỏi</span>
                  </Button>
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
                  <Button size="sm" onClick={() => setIsAddQuestionOpen(true)}>
                    <FiPlus /> Thêm câu hỏi đầu tiên
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                  {selectedQuiz.questions.map((q) => (
                    <div
                      key={q.id}
                      className="group p-3.5 sm:p-5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 transition space-y-3 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {q.question_order}
                          </span>
                          <h4 className="text-sm sm:text-base font-semibold text-slate-100 leading-snug break-words min-w-0">
                            {q.content}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                            <FiClock />
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

                      {/* 4 Option previews — dùng chung bộ màu A/B/C/D (lib/answerOptions) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {ANSWER_KEYS.map((key) => {
                          const text = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[key];
                          const isCorrect = q.correct_option === key;
                          return (
                            <div
                              key={key}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-semibold'
                                  : 'bg-slate-900/50 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={`font-bold ${OPTION_CONFIG[key].textAccent}`}>{key}.</span>
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
        </Card>
      </div>

      {/* Modal: Create Quiz */}
      <Modal open={isCreateQuizOpen} onClose={() => setIsCreateQuizOpen(false)} title="Tạo Bộ Đề Mới">
        <form onSubmit={handleCreateQuiz} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Tiêu đề đề thi</label>
            <input
              type="text"
              placeholder="Ví dụ: Kiểm tra 15 phút Toán học..."
              value={newQuizTitle}
              onChange={(e) => setNewQuizTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateQuizOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading || !newQuizTitle.trim()}>
              {actionLoading ? 'Đang tạo...' : 'Tạo Đề'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Question */}
      <Modal open={isAddQuestionOpen} onClose={() => setIsAddQuestionOpen(false)} title="Thêm Câu Hỏi Mới" maxWidth="xl">
        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nội dung câu hỏi</label>
            <textarea
              rows={3}
              placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
              value={questionContent}
              onChange={(e) => setQuestionContent(e.target.value)}
              className="w-full p-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              required
            />
          </div>

          {/* 4 Options — nhãn A/B/C/D dùng đúng bộ màu dùng chung (đây là ngoại lệ có chủ đích) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                ['A', optA, setOptA],
                ['B', optB, setOptB],
                ['C', optC, setOptC],
                ['D', optD, setOptD],
              ] as const
            ).map(([key, value, setValue]) => (
              <div key={key}>
                <label className={`block text-xs font-bold mb-1 ${OPTION_CONFIG[key].textAccent}`}>Lựa chọn {key}</label>
                <input
                  type="text"
                  placeholder={`Nội dung đáp án ${key}...`}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            ))}
          </div>

          {/* Correct Option & Time Limit */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Đáp án đúng</label>
              <div className="flex gap-2">
                {ANSWER_KEYS.map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setCorrectOpt(key)}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm border transition ${
                      correctOpt === key
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Thời gian (giây)</label>
              <input
                type="number"
                min="5"
                max="180"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddQuestionOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading}>
              {actionLoading ? 'Đang lưu...' : 'Lưu Câu Hỏi'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Bulk Import from Word */}
      <Modal
        open={isBulkWordOpen}
        onClose={() => {
          setIsBulkWordOpen(false);
          setBulkStep('input');
        }}
        title={
          <span className="flex items-center gap-2">
            <FiFileText className="text-blue-400" />
            <span>Dán & Nhập Đề Trắc Nghiệm Từ File Word</span>
          </span>
        }
        maxWidth="3xl"
      >
        <p className="text-xs text-slate-400 -mt-2 mb-4">
          Hỗ trợ cả đáp án dưới mỗi câu HOẶC bảng đáp án ở dưới cuối file (ví dụ: Câu 1 2 3... / Đáp án C B D...)
        </p>

        {bulkStep === 'input' ? (
          <div className="flex flex-col">
            <div className="mb-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 font-mono">
              <span className="text-blue-400 font-bold block mb-1">Hệ thống tự động nhận diện:</span>
              • Bảng đáp án ở cuối văn bản (như: ĐÁP ÁN VÀ LỜI GIẢI / Câu 1 2 3... Đáp án C B D...)<br />
              • Hoặc danh sách đáp án ở cuối (1.C 2.B 3.D...)<br />
              • Hoặc dấu hoa thị (*A.), hoặc dòng Đáp án: A dưới từng câu.
            </div>

            <div className="mb-4">
              <textarea
                rows={10}
                placeholder={`Dán toàn bộ nội dung file Word vào đây...\n\nVí dụ:\nCâu 1: Dung dịch là hỗn hợp\nA. của chất rắn trong chất lỏng\nB. của chất khí trong chất lỏng\nC. đồng nhất của chất rắn và dung môi\nD. đồng nhất của dung môi và chất tan\n\nCâu 2: Công thức của nước là gì?\nA. CO2\nB. H2O\nC. O2\nD. NaCl\n\nĐÁP ÁN VÀ LỜI GIẢI\nCâu  1  2\nĐáp án  D  B`}
                value={bulkWordText}
                onChange={(e) => setBulkWordText(e.target.value)}
                className="w-full min-h-[220px] p-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsBulkWordOpen(false)}>
                Hủy
              </Button>
              <Button type="button" size="sm" onClick={handleAnalyzeWord} disabled={!bulkWordText.trim()}>
                <FiChevronRight className="text-base" />
                <span>Tiếp Tục: Phân Tích & Chọn Đáp Án</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="text-xs font-bold text-emerald-400">
                ⚡ Đã nhận diện {parsedQuestions.length} câu hỏi. Bạn có thể click chọn lại đáp án đúng (A/B/C/D) cho từng câu:
              </div>
            </div>

            {/* Danh sách câu hỏi xem trước và chọn đáp án */}
            <div className="overflow-y-auto pr-1 space-y-3 max-h-[380px]">
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/80">
                  <div className="font-bold text-sm text-slate-100 mb-2">
                    <span className="text-blue-400 mr-2">Câu {idx + 1}:</span>
                    {q.content}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300 mb-3 pl-2">
                    <div className={q.correct_option === 'A' ? 'text-emerald-400 font-bold' : ''}>A. {q.option_a}</div>
                    <div className={q.correct_option === 'B' ? 'text-emerald-400 font-bold' : ''}>B. {q.option_b}</div>
                    <div className={q.correct_option === 'C' ? 'text-emerald-400 font-bold' : ''}>C. {q.option_c}</div>
                    <div className={q.correct_option === 'D' ? 'text-emerald-400 font-bold' : ''}>D. {q.option_d}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                    <span className="text-xs font-bold text-slate-400">Đáp án đúng:</span>
                    {ANSWER_KEYS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const updated = [...parsedQuestions];
                          updated[idx].correct_option = opt;
                          setParsedQuestions(updated);
                        }}
                        className={`w-9 h-8 rounded-lg font-bold text-xs transition flex items-center justify-center ${
                          q.correct_option === opt
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center gap-3 pt-3 mt-3 border-t border-slate-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setBulkStep('input')}>
                Quay Lại Sửa Văn Bản
              </Button>
              <Button type="button" size="sm" onClick={handleSaveBulkQuestions} disabled={actionLoading || parsedQuestions.length === 0}>
                <FiCheck />
                <span>{actionLoading ? 'Đang lưu...' : `Lưu Toàn Bộ ${parsedQuestions.length} Câu Hỏi`}</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}