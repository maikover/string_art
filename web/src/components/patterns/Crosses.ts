import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { getNailPositions } from '@/utils/geometry';

export interface CrossesConfig {
  nailCount?: number;
  lengthGap?: number;
  widthGap?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateCrossesPattern(
  width: number,
  height: number,
  config: CrossesConfig = {}
): Pattern {
  const {
    nailCount = 25,
    lengthGap = 0.27,
    widthGap = 0.43,
    rotation = 0,
    lineColor = '#ffffff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const lines: PatternLine[] = [];

  // Vertical line nails
  const verticalNailCount = nailCount;
  const verticalRadius = (height / 2 - 20) * (1 - lengthGap);
  const verticalNails = getNailPositions(center, verticalRadius, verticalNailCount);

  // Horizontal line nails
  const horizontalNailCount = nailCount;
  const horizontalRadius = (width / 2 - 20) * (1 - widthGap);
  const horizontalCenter: Coordinates = { x: width / 2, y: center.y };
  const horizontalNails = getNailPositions(horizontalCenter, horizontalRadius, horizontalNailCount);

  const nails = [...verticalNails, ...horizontalNails];
  const verticalOffset = 0;
  const horizontalOffset = verticalNailCount;

  // Draw vertical lines
  for (let i = 0; i < verticalNailCount; i++) {
    const nextIndex = (i + 1) % verticalNailCount;
    lines.push({ from: verticalOffset + i, to: verticalOffset + nextIndex, color: lineColor });
  }

  // Draw horizontal lines
  for (let i = 0; i < horizontalNailCount; i++) {
    const nextIndex = (i + 1) % horizontalNailCount;
    lines.push({ from: horizontalOffset + i, to: horizontalOffset + nextIndex, color: lineColor });
  }

  return {
    id: 'crosses',
    name: 'Crosses',
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
