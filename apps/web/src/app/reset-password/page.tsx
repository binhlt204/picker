'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AuthCard, Field, SubmitButton } from '@/components/auth/AuthCard';
import { api, getErrorMessage } from '@/lib/api';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      router.replace('/login?reset=1');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title="Link không hợp lệ">
        <div className="space-y-5">
          <Alert type="error">Link đặt lại mật khẩu thiếu mã xác nhận. Hãy yêu cầu link mới.</Alert>
          <Link
            href="/forgot-password"
            className="block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-sm py-2.5 transition"
          >
            Yêu cầu link mới
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Đặt mật khẩu mới" subtitle="Nhập mật khẩu mới cho tài khoản của bạn.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Field
          id="password"
          label="Mật khẩu mới (tối thiểu 8 ký tự, có chữ và số)"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          id="confirm"
          label="Nhập lại mật khẩu mới"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <SubmitButton loading={loading}>Đặt lại mật khẩu</SubmitButton>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
