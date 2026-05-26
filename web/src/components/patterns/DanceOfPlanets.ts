import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian, getNailPositions } from '@/utils/geometry';

export interface DanceOfPlanetsConfig {
  outerNailCount?: number;
  innerNailCount?: number;
  outerRadius?: number;
  innerRadius?: number;
  rounds?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateDanceOfPlanetsPattern(
  width: number,
  height: number,
  config: DanceOfPlanetsConfig = {}
): Pattern {
  const {
    outerNailCount = 150,
    innerNailCount = 117,
    outerRadius = 1,
    innerRadius = 0.8,
    rounds = 2,
    rotation = 0.216,
    lineColor = '#ffbb29',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const maxRadius = Math.min(width, height) / 2 - 20;

  const outerActualRadius = maxRadius * outerRadius;
  const innerActualRadius = maxRadius * innerRadius;

  const outerNails = getNailPositions(center, outerActualRadius, outerNailCount);
  const innerNails = getNailPositions(
    center,
    innerActualRadius,
    innerNailCount,
  ).map((nail) => ({
    ...nail,
    number: nail.number + outerNailCount,
  }));

  const nails = [...outerNails, ...innerNails];
  const lines: PatternLine[] = [];

  const steps = outerNailCount * rounds;
  let toInner = true;

  for (let step = 0; step < steps; step++) {
    const fromIndex = toInner
      ? step % outerNailCount
      : outerNailCount + (step % innerNailCount);
    const toIndex = toInner
      ? outerNailCount + (step % innerNailCount)
      : (step + 1) % (toInner ? outerNailCount : innerNailCount);

    if (step < steps - 1) {
      lines.push({ from: fromIndex, to: toIndex, color: lineColor });
      toInner = !toInner;
    }
  }

  return {
    id: 'dance_of_planets',
    name: 'Dance of Planets',
    nails,
    lines,
    options: {
      nailCount: outerNailCount + innerNailCount,
      nailColor,
      lineColor,
      backgroundColor,
    },
  };
}
