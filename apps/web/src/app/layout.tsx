import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { AuthGate, AuthProvider } from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'Pickball - Hệ Thống Trắc Nghiệm Thẻ Giấy Thời Gian Thực',
  description: 'Nền tảng kiểm tra trắc nghiệm bằng thẻ giấy thông minh ArUco dành cho giáo viên và học sinh.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800" />}>
            <Navbar />
          </Suspense>
          <Suspense fallback={<div className="flex-1 p-8 text-center text-slate-400">Đang tải...</div>}>
            <main className="flex-1 flex flex-col">
              <AuthGate>{children}</AuthGate>
            </main>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
