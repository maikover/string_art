import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian, getNailPositions } from '@/utils/geometry';

export interface AssymetryConfig {
  nailCount?: number;
  repetition?: number;
  innerLength?: number;
  rotation?: number;
  distortion?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateAssymetryPattern(
  width: number,
  height: number,
  config: AssymetryConfig = {}
): Pattern {
  const {
    nailCount = 200,
    repetition = 3,
    innerLength = 0.5,
    rotation = 0.75,
    lineColor = '#a94fb0',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2 - 20;
  const nails = getNailPositions(center, radius, nailCount);
  const lines: PatternLine[] = [];

  let currentInnerLength = Math.round(innerLength * nailCount);
  let repetitionCount = 0;
  const realRepetition = repetition * 2 - 1;

  let prevPointIndex = 0;
  let isPrevPoint = false;

  for (let i = 0; currentInnerLength > 0; i++) {
    prevPointIndex = isPrevPoint
      ? prevPointIndex - currentInnerLength + 1
      : prevPointIndex + currentInnerLength;

    if (repetitionCount === realRepetition) {
      currentInnerLength--;
      repetitionCount = 0;
      prevPointIndex++;
    } else {
      repetitionCount++;
    }

    const toIndex = ((prevPointIndex % nailCount) + nailCount) % nailCount;
    lines.push({ from: 0, to: toIndex, color: lineColor });
    isPrevPoint = !isPrevPoint;
  }

  return {
    id: 'assymetry',
    name: 'Assymetry',
    nails,
    lines,
    options: {
      nailCount,
      nailColor,
      lineColor,
      backgroundColor,
    },
  };
}
