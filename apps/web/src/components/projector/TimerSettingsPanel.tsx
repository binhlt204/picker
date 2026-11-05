'use client';

import React, { useEffect, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import type { TimerSettings } from '@pickball/shared';
import type { TimerSettingsPatch } from '@/hooks/useSocket';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';

interface QuestionLite {
  id: string;
  question_order: number;
  content: string;
  time_limit: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: TimerSettings | null;
  questions: QuestionLite[];
  currentQuestionId?: string | null;
  error?: string | null;
  onChange: (patch: TimerSettingsPatch) => void;
}

const MIN = 5;
const MAX = 600;

/** Kiểm tra ô nhập thời gian: '' = bỏ (dùng mặc định), 0 = không giới hạn, 5..600 giây. */
function parseInput(v: string): { value: number | null; error?: string } {
  const t = v.trim();
  if (t === '') return { value: null };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0 || (n > 0 && n < MIN) || n > MAX) {
    return { value: null, error: `Nhập 0 (không giới hạn) hoặc ${MIN}–${MAX} giây` };
  }
  return { value: n };
}

function describe(seconds: number | null): string {
  if (seconds === null) return 'Không giới hạn';
  return `${seconds} giây`;
}

/**
 * Bảng cài đặt hẹn giờ của phiên thi (máy chiếu). Thay đổi được gửi lên server và đồng bộ ngay
 * tới mọi thiết bị (cả điện thoại). Sửa thời gian của câu đang chạy sẽ đếm lại câu đó từ đầu.
 */
export function TimerSettingsPanel({ open, onClose, settings, questions, currentQuestionId, error, onChange }: Props) {
  const [allInput, setAllInput] = useState('');
  const [allError, setAllError] = useState<string | null>(null);
  const [rowInputs, setRowInputs] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Đồng bộ ô nhập với cài đặt mới nhất từ server (có thể do điện thoại vừa đổi)
  useEffect(() => {
    if (!settings) return;
    setAllInput(settings.timeLimitAll === null ? '' : String(settings.timeLimitAll));
    const next: Record<string, string> = {};
    for (const q of questions) {
      const own = settings.questionTimes[q.id];
      next[q.id] = own === undefined ? '' : String(own);
    }
    setRowInputs(next);
    setRowErrors({});
    setAllError(null);
  }, [settings, questions]);

  if (!open) return null;

  const enabled = settings?.timerEnabled ?? true;

  const effective = (q: QuestionLite): number | null => {
    if (!settings || !settings.timerEnabled) return null;
    const own = settings.questionTimes[q.id];
    if (own !== undefined) return own > 0 ? own : null;
    if (settings.timeLimitAll !== null) return settings.timeLimitAll > 0 ? settings.timeLimitAll : null;
    return q.time_limit > 0 ? q.time_limit : null;
  };

  const applyAll = () => {
    const r = parseInput(allInput);
    if (r.error) return setAllError(r.error);
    setAllError(null);
    onChange({ timeLimitAll: r.value });
  };

  const applyRow = (q: QuestionLite) => {
    const r = parseInput(rowInputs[q.id] ?? '');
    if (r.error) return setRowErrors((e) => ({ ...e, [q.id]: r.error! }));
    setRowErrors((e) => ({ ...e, [q.id]: '' }));
    onChange({ questionId: q.id, questionTime: r.value });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="3xl"
      title={
        <span className="flex items-center gap-2">
          <FiClock className="text-blue-400" /> Cài đặt thời gian
        </span>
      }
    >
      <div className="space-y-6">
        {error && (
          <div role="alert" className="rounded-lg px-4 py-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-300">
            {error}
          </div>
        )}

        {/* Bật / tắt đếm giờ */}
        <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-800/60 border border-slate-700 p-4">
          <div>
            <div className="font-semibold">Đếm giờ cho câu hỏi</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Tắt: câu hỏi không giới hạn thời gian, giáo viên tự bấm <b>Khóa câu</b>. Bật: hết giờ hệ thống tự khóa câu.
            </div>
          </div>
          <Switch checked={enabled} onChange={(v) => onChange({ timerEnabled: v })} label={enabled ? 'Đang bật' : 'Đang tắt'} />
        </div>

        <fieldset disabled={!enabled} className={enabled ? '' : 'opacity-50'}>
          {/* Thời gian cho tất cả câu */}
          <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4">
            <label htmlFor="time-all" className="font-semibold block">Thời gian cho tất cả câu</label>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">
              Để trống = mỗi câu dùng thời gian đã soạn trong đề. Nhập 0 = không giới hạn. Câu nào đặt thời gian riêng bên dưới sẽ ưu tiên thời gian riêng.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="time-all"
                type="number"
                min={0}
                max={MAX}
                inputMode="numeric"
                placeholder="Theo từng câu"
                value={allInput}
                onChange={(e) => setAllInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyAll()}
                className="w-36 rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-400">giây</span>
              <Button size="sm" onClick={applyAll}>
                Áp dụng
              </Button>
              {settings?.timeLimitAll !== null && settings?.timeLimitAll !== undefined && (
                <Button variant="secondary" size="sm" onClick={() => onChange({ timeLimitAll: null })}>
                  Dùng thời gian từng câu
                </Button>
              )}
              {[15, 30, 45, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({ timeLimitAll: s })}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-xs"
                >
                  {s}s
                </button>
              ))}
            </div>
            {allError && <p className="text-xs text-rose-400 mt-2">{allError}</p>}
          </div>

          {/* Thời gian từng câu */}
          <div className="mt-6">
            <div className="font-semibold">Thời gian từng câu</div>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">
              Để trống = dùng thời gian chung. Nhập 0 = câu đó không giới hạn. Sửa câu đang chạy sẽ đếm lại câu đó từ đầu.
            </p>
            <div className="rounded-lg border border-slate-700 divide-y divide-slate-800">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${q.id === currentQuestionId ? 'bg-blue-600/10' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">
                      Câu {q.question_order}. {q.content}
                      {q.id === currentQuestionId && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white align-middle">ĐANG CHẠY</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Đang áp dụng: <b className="text-slate-200">{describe(effective(q))}</b> · Trong đề: {q.time_limit} giây
                    </div>
                    {rowErrors[q.id] && <div className="text-xs text-rose-400 mt-1">{rowErrors[q.id]}</div>}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={MAX}
                    inputMode="numeric"
                    aria-label={`Thời gian riêng câu ${q.question_order} (giây)`}
                    placeholder="Mặc định"
                    value={rowInputs[q.id] ?? ''}
                    onChange={(e) => setRowInputs((r) => ({ ...r, [q.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && applyRow(q)}
                    className="w-28 rounded-lg bg-slate-900 border border-slate-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button size="sm" onClick={() => applyRow(q)}>
                    Lưu
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
