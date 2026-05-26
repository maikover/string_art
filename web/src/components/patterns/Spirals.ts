import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface SpiralsConfig {
  nSpirals?: number;
  nailsPerSpiral?: number;
  angle?: number;
  rotation?: number;
  radiusEasing?: number;
  angleEasing?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateSpiralsPattern(
  width: number,
  height: number,
  config: SpiralsConfig = {}
): Pattern {
  const {
    nSpirals = 3,
    nailsPerSpiral = 80,
    angle = 0.52,
    rotation = 65 / 360,
    radiusEasing = 1.8,
    angleEasing = 1.3,
    lineColor = '#00d5ff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const maxRadius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];
  const nails: { point: Coordinates; number: number }[] = [];

  const PI2 = Math.PI * 2;
  const totalAngle = angle * PI2;
  const spiralRotations = Array.from({ length: nSpirals }, (_, i) => (i * PI2) / nSpirals);
  const rotationAngle = -PI2 * rotation;

  // Helper easing function
  const easeOut = (t: number): number => Math.pow(t, radiusEasing);

  let nailIndex = 0;
  const points: Coordinates[] = [];

  // Generate spiral points
  for (let s = 0; s < nSpirals; s++) {
    for (let i = 1; i < nailsPerSpiral; i++) {
      const progress = i / (nailsPerSpiral - 1);
      const easedProgress = easeOut(progress);

      const spiralAngle =
        rotationAngle +
        easedProgress * totalAngle +
        spiralRotations[s];

      const radius = easedProgress * maxRadius;

      const x = center.x + radius * Math.cos(spiralAngle);
      const y = center.y + radius * Math.sin(spiralAngle);

      points.push({ x, y });
      nails.push({ point: { x, y }, number: nailIndex++ });
    }
  }

  // Connect consecutive points in sequence
  for (let i = 1; i < points.length; i++) {
    lines.push({ from: i - 1, to: i, color: lineColor });
  }

  // Connect spiral endpoints back to center area
  for (let s = 0; s < nSpirals; s++) {
    const lastIdx = (s + 1) * (nailsPerSpiral - 1) - 1;
    if (lastIdx < points.length) {
      lines.push({ from: lastIdx, to: 0, color: lineColor });
    }
  }

  return {
    id: 'spirals',
    name: 'Spirals',
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
