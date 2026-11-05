'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Alert, AuthCard, Field, SubmitButton } from '@/components/auth/AuthCard';
import { api, getErrorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(res.data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, hệ thống sẽ gửi link để đặt mật khẩu mới."
      footer={
        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}
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
        <SubmitButton loading={loading}>Gửi link đặt lại mật khẩu</SubmitButton>
        <p className="text-xs text-slate-500">
          Không nhận được email? Hãy nhờ quản trị viên đặt mật khẩu mới cho bạn trong trang quản trị.
        </p>
      </form>
    </AuthCard>
  );
}
