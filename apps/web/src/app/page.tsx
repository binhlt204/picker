'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  FiUsers,
  FiFileText,
  FiPlayCircle,
  FiDownload,
  FiAward,
  FiPlus,
  FiArrowRight,
  FiMonitor,
} from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { Badge } from '@/components/ui/Badge';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    classrooms: 0,
    students: 0,
    quizzes: 0,
    sessions: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [classesRes, quizzesRes, sessionsRes] = await Promise.all([
          api.get('/classrooms'),
          api.get('/quizzes'),
          api.get('/sessions'),
        ]);

        let studentCount = 0;
        classesRes.data.forEach((c: any) => {
          studentCount += c.students?.length || 0;
        });

        setStats({
          classrooms: classesRes.data.length,
          students: studentCount,
          quizzes: quizzesRes.data.length,
          sessions: sessionsRes.data.length,
        });

        setRecentSessions(sessionsRes.data.slice(0, 5));
      } catch (err) {
        console.error('Lỗi tải dữ liệu dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner — khoảnh khắc gradient duy nhất được giữ lại có chủ đích */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/40 via-slate-900/60 to-indigo-950/40 border border-blue-500/20 p-8 sm:p-10 backdrop-blur-md">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold mb-4">
            🚀 Công nghệ thị giác máy tính ArUco Realtime
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-100 tracking-tight leading-tight">
            Trắc Nghiệm Bằng Thẻ Giấy <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Chấm Điểm Tức Thì Trên Máy Chiếu
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Không cần học sinh dùng điện thoại hay máy tính. Học sinh chỉ cần xoay thẻ giấy 4 cạnh A-B-C-D, giáo viên quét 1 lần thu thập kết quả cả lớp dưới 2 giây.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/sessions">
              <Button size="lg">
                <FiPlayCircle className="text-xl" />
                <span>Bắt Đầu Phiên Kiểm Tra</span>
              </Button>
            </Link>

            <Link href="/classrooms">
              <Button variant="secondary" size="lg">
                <FiDownload className="text-lg text-blue-400" />
                <span>In Thẻ Theo Lớp</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Lớp Học" value={stats.classrooms} icon={<FiUsers />} tone="brand" />
        <StatTile label="Bộ Đề Thi" value={stats.quizzes} icon={<FiFileText />} tone="brand" />
        <StatTile label="Phiên Đã Tổ Chức" value={stats.sessions} icon={<FiPlayCircle />} tone="brand" />
        <StatTile label="Độ trễ Realtime" value="< 50ms" icon={<FiAward />} tone="brand" />
      </div>

      {/* Main Grid: Recent Sessions + How it Works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Sessions List */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Phiên Kiểm Tra Gần Đây</h2>
              <p className="text-sm text-slate-400">Trực tiếp mở máy chiếu hoặc xem lại bảng điểm</p>
            </div>
            <Link
              href="/sessions"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Xem tất cả <FiArrowRight />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Đang tải dữ liệu...</div>
          ) : recentSessions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400 mb-4">Chưa có phiên kiểm tra nào.</p>
              <Link href="/sessions">
                <Button size="sm">
                  <FiPlus /> Tạo phiên đầu tiên
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 transition"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-base text-slate-100">{session.quiz_title}</span>
                      <Badge tone={session.status === 'COMPLETED' ? 'neutral' : 'success'}>
                        {session.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang hoạt động'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Lớp: <span className="text-slate-200 font-semibold">{session.classroom_name}</span> • {session.total_students || 0} học sinh • {session.total_questions || 0} câu hỏi
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/sessions/projector/${session.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <FiMonitor /> Máy chiếu
                    </Link>
                    <Link
                      href={`/results/${session.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <FiAward /> Kết quả
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* How It Works Visual Stepper */}
        <Card padding="lg" className="flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Quy Trình 5 Bước</h2>
            <p className="text-sm text-slate-400 mb-6">Cách vận hành hệ thống trắc nghiệm thẻ</p>

            <div className="space-y-4">
              {[
                { title: 'In thẻ giấy ArUco', desc: 'Vào Lớp học, tải PDF thẻ theo danh sách lớp và in trên giấy bìa A5, ép plastic để dùng cả năm.' },
                { title: 'Nhập danh sách học sinh', desc: 'Dán từ Excel, hệ thống tự động gán mã thẻ #01 đến #50.' },
                { title: 'Soạn đề & Khởi tạo phiên', desc: 'Soạn câu hỏi 4 đáp án A-B-C-D với thời gian giới hạn đếm ngược.' },
                { title: 'Quét bằng Camera điện thoại', desc: 'Học sinh giơ thẻ theo hướng đáp án muốn chọn, camera quét tức thì.' },
                { title: 'Xuất điểm Excel & Thống kê', desc: 'Tự động tính điểm thang 10, phân tích câu khó và xuất file Excel.' },
              ].map((step, i) => (
                <div key={step.title} className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{step.title}</h4>
                    <p className="text-xs text-slate-400">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <Link href="/classrooms">
              <Button variant="secondary" className="w-full">
                <FiUsers /> Quản lý danh sách lớp ngay
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
