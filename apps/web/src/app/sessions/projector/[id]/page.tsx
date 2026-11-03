'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProjectorView } from '@/components/projector/ProjectorView';
import { FiAlertCircle, FiHome } from 'react-icons/fi';

export default function SessionProjectorPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        setLoading(true);
        const res = await api.get(`/sessions/${sessionId}`);
        setSessionData(res.data);
      } catch (err: any) {
        console.error('Lỗi tải thông tin phiên:', err);
        setError(err.response?.data?.error || 'Không tìm thấy phiên làm bài');
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Đang chuẩn bị màn hình máy chiếu...</p>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-3xl mb-4">
          <FiAlertCircle />
        </div>
        <h2 className="text-2xl font-bold mb-2">Không thể tải phiên thi</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button
          onClick={() => router.push('/sessions')}
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-2"
        >
          <FiHome /> Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <ProjectorView
      sessionId={sessionData.id}
      sessionTitle={sessionData.quiz_title}
      className={sessionData.classroom_name}
      questions={sessionData.questions || []}
      students={sessionData.students || []}
    />
  );
}
