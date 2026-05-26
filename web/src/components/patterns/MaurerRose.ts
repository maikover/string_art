import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface MaurerRoseConfig {
  n?: number;
  maxSteps?: number;
  angle?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateMaurerRosePattern(
  width: number,
  height: number,
  config: MaurerRoseConfig = {}
): Pattern {
  const {
    n = 4,
    maxSteps = 512,
    angle = 341,
    rotation = 0,
    lineColor = '#ffffff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];
  const nails: { point: Coordinates; number: number }[] = [];

  const PI2 = Math.PI * 2;
  const angleRadians = (PI2 * angle) / maxSteps;
  const rotationAngle = -PI2 * rotation;

  // Generate Maurer Rose points
  for (let step = 0; step <= maxSteps; step++) {
    const k = step * angleRadians;
    const r = radius * Math.sin(n * k);

    const x = center.x + r * Math.cos(k + rotationAngle);
    const y = center.y + r * Math.sin(k + rotationAngle);

    nails.push({ point: { x, y }, number: step });
  }

  // Connect consecutive points
  for (let step = 1; step <= maxSteps; step++) {
    lines.push({
      from: step - 1,
      to: step,
      color: lineColor,
    });
  }

  return {
    id: 'maurer_rose',
    name: 'Maurer Rose',
    nails,
    lines,
    options: {
      nailCount: nails.length,
      nailColor,
      lineColor,
      backgroundColor,
    },
  };
}
