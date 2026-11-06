import React from 'react';
import { FiLayers } from 'react-icons/fi';

/**
 * Logo dùng chung cho Navbar và AuthCard — trước đây markup này bị copy-paste
 * ở 2 nơi với gradient + glow riêng, giờ gộp về 1 nền xanh dương đặc duy nhất.
 */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={`${box} rounded-lg bg-blue-600 flex items-center justify-center shrink-0`}>
      <FiLayers className="text-white text-base" />
    </div>
  );
}
