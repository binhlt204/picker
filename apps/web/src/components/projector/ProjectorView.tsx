'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useTimer } from '@/hooks/useTimer';
import { CountdownTimer } from './CountdownTimer';
import { AnswerOptions } from './AnswerOptions';
import { StudentGrid } from './StudentGrid';
import { ResultChart } from './ResultChart';
import { FiMaximize, FiMinimize, FiCheckCircle, FiChevronRight, FiLock, FiHome, FiAward } from 'react-icons/fi';

interface QuestionItem {
  id: string;
  question_order: number;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  time_limit: number;
}

interface StudentItem {
  id: string;
  card_id: number;
  full_name: string;
}

interface Props {
  sessionId: string;
  sessionTitle: string;
  className: string;
  questions: QuestionItem[];
  students: StudentItem[];
}

export function ProjectorView({ sessionId, sessionTitle, className, questions, students }: Props) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    isConnected,
    currentQuestion,
    submittedCardIds,
    totalStudents,
    setTotalStudents,
    isLocked,
    lockData,
    isSessionEnded,
    nextQuestion,
    lockQuestion,
    endSession,
  } = useSocket(sessionId);

  // Set total students from props on mount
  useEffect(() => {
    if (students.length > 0) {
      setTotalStudents(students.length);
    }
  }, [students.length, setTotalStudents]);

  const timer = useTimer(currentQuestion?.timeLimit || 30, () => {
    lockQuestion();
  });

  // Reset timer whenever a new question starts
  useEffect(() => {
    if (currentQuestion) {
      timer.reset(currentQuestion.timeLimit);
    }
  }, [currentQuestion]);

  const currentIdx = currentQuestion
    ? questions.findIndex((q) => q.id === currentQuestion.questionId)
    : -1;
  const isLastQuestion = currentIdx !== -1 && currentIdx === questions.length - 1;

  const handleStart = () => {
    if (questions.length > 0) {
      nextQuestion(questions[0].id, questions[0].time_limit);
    }
  };

  const handleNext = () => {
    if (currentIdx !== -1 && currentIdx < questions.length - 1) {
      const next = questions[currentIdx + 1];
      nextQuestion(next.id, next.time_limit);
    }
  };

  const handleEndAndShowResults = () => {
    endSession();
    router.push(`/results/${sessionId}`);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // State: Waiting to Start
  if (!currentQuestion) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-between p-8 select-none">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/sessions')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title="Thoát về danh sách phiên"
            >
              <FiHome className="text-xl" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{sessionTitle}</h2>
              <p className="text-sm text-slate-400">Lớp: {className} • {students.length} học sinh</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300">{isConnected ? 'Sẵn sàng kết nối' : 'Đang kết nối...'}</span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title="Toàn màn hình (F11)"
            >
              {isFullscreen ? <FiMinimize className="text-xl" /> : <FiMaximize className="text-xl" />}
            </button>
          </div>
        </header>

        <main className="text-center max-w-2xl mx-auto my-auto py-12">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-4xl text-blue-400 shadow-2xl">
            🎯
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Màn Hình Máy Chiếu Trực Tiếp
          </h1>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Giáo viên mở ứng dụng trên điện thoại để quét mã thẻ ArUco của học sinh.<br />
            Bộ đề gồm <span className="font-bold text-white">{questions.length} câu hỏi</span>.
          </p>

          <button
            onClick={handleStart}
            disabled={questions.length === 0}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-2xl font-black shadow-[0_0_35px_rgba(59,130,246,0.4)] transition hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <span>BẮT ĐẦU CÂU 1</span>
            <FiChevronRight className="text-2xl" />
          </button>
        </main>

        <footer className="text-center text-xs text-slate-500">
          Pickball Realtime Paper Quiz System • Nhấn F11 để bật/tắt toàn màn hình
        </footer>
      </div>
    );
  }

  // State: Answering or Locked
  const studentCount = totalStudents > 0 ? totalStudents : students.length;
  const progressPct = studentCount > 0 ? Math.min(100, Math.round((submittedCardIds.length / studentCount) * 100)) : 0;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-between p-6 select-none overflow-x-hidden">
      {/* Top Header */}
      <header className="flex justify-between items-center gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-black text-base tracking-wide">
            CÂU {currentQuestion.questionOrder} / {currentQuestion.totalQuestions}
          </span>
          <span className="hidden sm:inline text-sm font-medium text-slate-400 truncate max-w-md">
            {sessionTitle} • {className}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <CountdownTimer
            timeLeft={timer.timeLeft}
            total={currentQuestion.timeLimit}
            isWarning={timer.isWarning}
          />

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Toàn màn hình"
          >
            {isFullscreen ? <FiMinimize className="text-lg" /> : <FiMaximize className="text-lg" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 my-3 flex flex-col justify-center max-w-6xl w-full mx-auto">
        {/* Question Content */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl mb-2">
          <p className="text-2xl md:text-3xl font-bold leading-relaxed text-slate-100">
            {currentQuestion.content}
          </p>
        </div>

        {/* 4 Options Grid */}
        <AnswerOptions
          options={{
            A: currentQuestion.optionA,
            B: currentQuestion.optionB,
            C: currentQuestion.optionC,
            D: currentQuestion.optionD,
          }}
          correctOption={isLocked && lockData ? lockData.correctOption : undefined}
          distribution={isLocked && lockData ? lockData.answerDistribution : undefined}
        />

        {/* Statistics Bar (Locked only) */}
        {isLocked && lockData && (
          <ResultChart
            distribution={lockData.answerDistribution}
            correctOption={lockData.correctOption}
            totalSubmitted={submittedCardIds.length}
          />
        )}
      </main>

      {/* Bottom Section: Student Grid & Controls */}
      <footer className="w-full max-w-6xl mx-auto pt-2 border-t border-slate-800">
        <div className="flex justify-between items-center mb-2 text-xs md:text-sm font-semibold">
          <div className="flex items-center gap-2">
            <span className="text-slate-300">
              Đã thu thập bài: <span className="font-bold text-emerald-400 font-mono text-base">{submittedCardIds.length}</span>/{studentCount} học sinh
            </span>
            <span className="text-slate-500">({progressPct}%)</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {!isLocked ? (
              <button
                onClick={() => lockQuestion()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs md:text-sm font-bold transition active:scale-95"
              >
                <FiLock className="text-base" />
                <span>Khóa câu hỏi</span>
              </button>
            ) : isLastQuestion ? (
              <button
                onClick={handleEndAndShowResults}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm md:text-base shadow-lg transition active:scale-95"
              >
                <FiAward className="text-lg" />
                <span>KẾT THÚC & XEM KẾT QUẢ</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm md:text-base shadow-lg transition active:scale-95 animate-pulse"
              >
                <span>CÂU TIẾP THEO</span>
                <FiChevronRight className="text-lg" />
              </button>
            )}
          </div>
        </div>

        {/* Student Cards Grid */}
        <StudentGrid
          totalStudents={studentCount}
          submittedCardIds={submittedCardIds}
          isLocked={isLocked}
          finalAnswers={lockData?.finalAnswers}
          correctOption={lockData?.correctOption}
          studentsList={students}
        />
      </footer>
    </div>
  );
}
