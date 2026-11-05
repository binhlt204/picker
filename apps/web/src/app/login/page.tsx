'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert, AuthCard, Field, SubmitButton } from '@/components/auth/AuthCard';
import { getErrorMessage } from '@/lib/api';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chỉ cho quay lại đường dẫn nội bộ (tránh chuyển hướng ra trang ngoài)
  const rawNext = search.get('next') || '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
  const resetDone = search.get('reset') === '1';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng nhập thất bại'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Đăng nhập"
      subtitle="Đăng nhập để quản lý lớp học, đề thi và phiên kiểm tra"
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
            Đăng ký
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {resetDone && <Alert type="success">Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.</Alert>}
        {error && <Alert type="error">{error}</Alert>}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ten@truong.edu.vn"
        />
        <Field
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <div className="text-right -mt-1">
          <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
            Quên mật khẩu?
          </Link>
        </div>
        <SubmitButton loading={loading}>Đăng nhập</SubmitButton>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
