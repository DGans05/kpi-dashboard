'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  lineColor?: string;
  fillColor?: string;
  showDots?: boolean;
  animate?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  lineColor = 'currentColor',
  fillColor = 'none',
  showDots = false,
  animate = true,
}: SparklineProps) {
  const { path, dots } = useMemo(() => {
    if (data.length === 0) {
      return { path: '', dots: [] };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y, value };
    });

    // Create smooth curve path
    const pathData = points.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x},${point.y}`;
      }

      const prevPoint = points[index - 1];
      const controlX = (prevPoint.x + point.x) / 2;

      return `${acc} Q ${controlX},${prevPoint.y} ${controlX},${point.y} T ${point.x},${point.y}`;
    }, '');

    return { path: pathData, dots: showDots ? points : [] };
  }, [data, width, height, showDots]);

  if (data.length === 0) {
    return null;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      style={{ minWidth: width }}
    >
      {/* Fill area */}
      {fillColor !== 'none' && (
        <path
          d={`${path} L ${width},${height} L 0,${height} Z`}
          fill={fillColor}
          opacity={0.2}
          className={animate ? 'animate-fade-in' : ''}
        />
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? 'animate-draw-line' : ''}
        style={{
          vectorEffect: 'non-scaling-stroke',
        }}
      />

      {/* Dots */}
      {dots.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x}
          cy={dot.y}
          r={2}
          fill={lineColor}
          className={animate ? 'animate-scale-in' : ''}
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        />
      ))}
    </svg>
  );
}

// Add these to your globals.css
// @keyframes draw-line {
//   from {
//     stroke-dasharray: 1000;
//     stroke-dashoffset: 1000;
//   }
//   to {
//     stroke-dasharray: 1000;
//     stroke-dashoffset: 0;
//   }
// }
//
// @keyframes fade-in {
//   from { opacity: 0; }
//   to { opacity: 0.2; }
// }
//
// @keyframes scale-in {
//   from { transform: scale(0); }
//   to { transform: scale(1); }
// }
//
// .animate-draw-line {
//   animation: draw-line 1s ease-out forwards;
// }
//
// .animate-fade-in {
//   animation: fade-in 0.5s ease-out forwards;
// }
//
// .animate-scale-in {
//   animation: scale-in 0.3s ease-out forwards;
// }
