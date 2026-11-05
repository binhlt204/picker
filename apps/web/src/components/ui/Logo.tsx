import React from 'react';
import { FiLayers } from 'react-icons/fi';

/**
 * Logo dùng chung cho Navbar và AuthCard — trước đây markup này bị copy-paste
 * ở 2 nơi với gradient + glow riêng, giờ gộp về 1 nền xanh dương đặc duy nhất.
 */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-10 h-10' : 'w-11 h-11';
  return (
    <div className={`${box} rounded-lg bg-blue-600 flex items-center justify-center shadow-sm`}>
      <FiLayers className="text-white text-lg" />
    </div>
  );
}
