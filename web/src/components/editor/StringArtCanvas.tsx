'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Pattern, Nail, PatternLine, Coordinates } from '@/types/stringart';

interface StringArtCanvasProps {
  pattern: Pattern | null;
  width?: number;
  height?: number;
  nailRadius?: number;
  nailColor?: string;
  lineColor?: string;
  lineWidth?: number;
  backgroundColor?: string;
  showNailNumbers?: boolean;
  renderer?: 'canvas' | 'svg';
  className?: string;
}

function drawNails(
  ctx: CanvasRenderingContext2D,
  nails: Nail[],
  radius: number,
  color: string,
  showNumbers: boolean
) {
  nails.forEach((nail) => {
    ctx.beginPath();
    ctx.arc(nail.point.x, nail.point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (showNumbers) {
      ctx.fillStyle = '#000';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        String(nail.number),
        nail.point.x,
        nail.point.y
      );
    }
  });
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  nails: Nail[],
  lines: PatternLine[],
  lineWidth: number,
  getColor: (line: PatternLine) => string
) {
  lines.forEach((line) => {
    const fromNail = nails[line.from];
    const toNail = nails[line.to];
    if (!fromNail || !toNail) return;

    ctx.beginPath();
    ctx.moveTo(fromNail.point.x, fromNail.point.y);
    ctx.lineTo(toNail.point.x, toNail.point.y);
    ctx.strokeStyle = line.color ?? getColor(line) ?? '#000';
    ctx.lineWidth = lineWidth ?? 1;
    ctx.stroke();
  });
}

function CanvasRenderer({
  pattern,
  width,
  height,
  nailRadius,
  nailColor,
  lineColor,
  lineWidth,
  backgroundColor,
  showNailNumbers,
  className,
}: StringArtCanvasProps & { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pattern) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor ?? '#fff';
    ctx.fillRect(0, 0, width, height);

    drawLines(
      ctx,
      pattern.nails,
      pattern.lines,
      lineWidth ?? 1,
      () => lineColor ?? '#000'
    );

    drawNails(ctx, pattern.nails, nailRadius ?? 6, nailColor ?? '#333', showNailNumbers ?? false);
  }, [pattern, width, height, nailRadius, nailColor, lineColor, lineWidth, backgroundColor, showNailNumbers]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}

function SVGRenderer({
  pattern,
  width,
  height,
  nailRadius,
  nailColor,
  lineColor,
  lineWidth,
  backgroundColor,
  showNailNumbers,
  className,
}: StringArtCanvasProps & { width: number; height: number }) {
  if (!pattern) return null;
  return (
    <svg
      width={width}
      height={height}
      className={className}
    >
      <rect width={width} height={height} fill={backgroundColor} />
      <g>
        {pattern.lines.map((line, i) => {
          const from = pattern.nails[line.from];
          const to = pattern.nails[line.to];
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.point.x}
              y1={from.point.y}
              x2={to.point.x}
              y2={to.point.y}
              stroke={line.color ?? lineColor}
              strokeWidth={lineWidth}
            />
          );
        })}
      </g>
      <g>
        {pattern.nails.map((nail) => (
          <g key={nail.number}>
            <circle
              cx={nail.point.x}
              cy={nail.point.y}
              r={nailRadius}
              fill={nailColor}
              stroke="#000"
              strokeWidth={1}
            />
            {showNailNumbers && (
              <text
                x={nail.point.x}
                y={nail.point.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                fontFamily="monospace"
                fill="#000"
              >
                {nail.number}
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

export function StringArtCanvas(props: StringArtCanvasProps) {
  const {
    pattern,
    width = 600,
    height = 600,
    renderer = 'canvas',
    className,
  } = props;

  if (!pattern) {
    return (
      <div
        className={className}
        style={{ width, height, backgroundColor: '#f9f9f9' }}
      />
    );
  }

  if (renderer === 'svg') {
    return <SVGRenderer {...props} width={width} height={height} />;
  }

  return <CanvasRenderer {...props} width={width} height={height} />;
}

export type { StringArtCanvasProps };
