import React from 'react';

export function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', className = '', style = {} }) {
  return (
    <div 
      className={`rf-skeleton ${className}`} 
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonCard({ height = "120px" }) {
  return (
    <Skeleton height={height} borderRadius="14px" />
  );
}

export function SkeletonGrid({ count = 6, height = "120px" }) {
  return (
    <div className="rf-stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={height} />
      ))}
    </div>
  );
}
