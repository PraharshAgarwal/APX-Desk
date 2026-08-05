'use client';

import React from 'react';

/* ── Base pulse animation ─────────────────────────────────────── */
const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
  borderRadius: 6,
};

/* ── Single line / block ────────────────────────────────────────── */
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  return (
    <div
      style={{
        ...shimmer,
        width,
        height,
        borderRadius: radius,
        display: 'inline-block',
        ...style,
      }}
    />
  );
}

/* ── Stat card grid ─────────────────────────────────────────────── */
export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        gap: 16,
        marginBottom: 24,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card" style={{ gap: 0 }}>
          <Skeleton width="55%" height={11} style={{ marginBottom: 12 }} />
          <Skeleton width="40%" height={28} radius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="65%" height={10} />
        </div>
      ))}
    </div>
  );
}

/* ── Table body rows ────────────────────────────────────────────── */
export function SkeletonTable({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} style={{ padding: '10px 12px' }}>
              <Skeleton
                height={13}
                width={c === 0 ? '80%' : c === cols - 1 ? '50%' : `${60 + Math.random() * 30}%`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ── Card placeholder ───────────────────────────────────────────── */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      <div className="card-header">
        <Skeleton width={140} height={16} />
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={i % 3 === 0 ? '60%' : i % 2 === 0 ? '80%' : '100%'} height={13} />
        ))}
      </div>
    </div>
  );
}

/* Inject keyframe once via a style tag */
if (typeof document !== 'undefined') {
  const id = '__sk_kf__';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes skeleton-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(s);
  }
}

export default Skeleton;
