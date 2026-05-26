import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian, getNailPositions } from '@/utils/geometry';

export interface CometConfig {
  nailCount?: number;
  layers?: number;
  ringSize?: number;
  rotation?: number;
  distortion?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateCometPattern(
  width: number,
  height: number,
  config: CometConfig = {}
): Pattern {
  const {
    nailCount = 51,
    layers = 11,
    ringSize = 0.47,
    rotation = 90 / 360,
    lineColor = '#ff0000',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2 - 20;
  const nails = getNailPositions(center, radius, nailCount);
  const lines: PatternLine[] = [];

  const firstLayerDistance = Math.floor(nailCount * ringSize);

  for (let layer = 0; layer < layers; layer++) {
    const layerDistance = Math.floor(((layers - layer) * firstLayerDistance) / layers);
    const maxStep = nailCount - layerDistance + 1;
    let prevPointIndex = 0;

    for (let i = 0; i <= nailCount - layerDistance; i++) {
      const toIndex = (i + layerDistance) % nailCount;
      lines.push({ from: prevPointIndex, to: toIndex, color: lineColor });

      if (i !== maxStep - 1) {
        prevPointIndex = i + 1;
        lines.push({ from: prevPointIndex, to: toIndex, color: lineColor });
      }
    }
  }

  return {
    id: 'comet',
    name: 'Comet',
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
