import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian, getNailPositions } from '@/utils/geometry';

export interface FreestyleConfig {
  layers?: number;
  radius1?: number;
  radius2?: number;
  radius3?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x3?: number;
  y3?: number;
  n1?: number;
  n2?: number;
  n3?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateFreestylePattern(
  width: number,
  height: number,
  config: FreestyleConfig = {}
): Pattern {
  const {
    layers = 3,
    radius1 = 0.5,
    radius2 = 0.5,
    radius3 = 0.5,
    x1 = 0.5,
    y1 = 0.5,
    x2 = 0,
    y2 = 1,
    x3 = 1,
    y3 = 1,
    n1 = 80,
    n2 = 80,
    n3 = 80,
    lineColor = '#ec6ad0',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const maxRadius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];

  const layer1Center: Coordinates = {
    x: width * x1,
    y: height * y1,
  };
  const layer2Center: Coordinates = {
    x: width * x2,
    y: height * y2,
  };
  const layer3Center: Coordinates = {
    x: width * x3,
    y: height * y3,
  };

  const layer1Nails = getNailPositions(layer1Center, maxRadius * radius1, n1);
  const layer2Nails = getNailPositions(layer2Center, maxRadius * radius2, n2);
  const layer3Nails = getNailPositions(layer3Center, maxRadius * radius3, n3);

  const nails = [...layer1Nails, ...layer2Nails, ...layer3Nails];
  const offsets = [0, n1, n1 + n2];
  const nailCounts = [n1, n2, n3];

  const roundsCount = Math.max(n1, n2, n3);

  for (let i = 0; i < roundsCount; i++) {
    for (let layer = 0; layer < layers; layer++) {
      const nextLayer = (layer + 1) % layers;
      const fromIdx = offsets[layer] + (i % nailCounts[layer]);
      const toIdx = offsets[nextLayer] + (i % nailCounts[nextLayer]);
      lines.push({ from: fromIdx, to: toIdx, color: lineColor });
    }
  }

  return {
    id: 'freestyle',
    name: 'Freestyle',
    nails,
    lines,
    options: {
      nailCount: n1 + n2 + n3,
      nailColor,
      lineColor,
      backgroundColor,
    },
  };
}
