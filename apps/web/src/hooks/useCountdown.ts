'use client';

import { useEffect, useState } from 'react';
import type { ClientTimer } from './useSocket';

/**
 * Số giây còn lại của câu hiện tại, tính theo thời điểm hết giờ do server gửi (endsAt) và
 * độ lệch đồng hồ giữa server và máy này. Nhờ vậy máy chiếu và điện thoại luôn hiển thị cùng một con số,
 * kể cả khi mở lại trang hay kết nối lại giữa chừng.
 * Trả về null khi câu không giới hạn thời gian (hoặc đã khóa).
 */
export function useCountdown(timer: ClientTimer): number | null {
  const compute = () =>
    timer.endsAt === null
      ? null
      : Math.max(0, Math.ceil((timer.endsAt - (Date.now() + timer.clockOffset)) / 1000));

  const [secondsLeft, setSecondsLeft] = useState<number | null>(compute);

  useEffect(() => {
    setSecondsLeft(compute());
    if (timer.endsAt === null) return;
    const id = setInterval(() => setSecondsLeft(compute()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.endsAt, timer.clockOffset]);

  return secondsLeft;
}
