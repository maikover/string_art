import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface HexagonSpadesConfig {
  nailCount?: number;
  density?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateHexagonSpadesPattern(
  width: number,
  height: number,
  config: HexagonSpadesConfig = {}
): Pattern {
  const {
    nailCount = 50,
    density = 2,
    rotation = 0,
    lineColor = '#ffffff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const maxRadius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];
  const nails: { point: Coordinates; number: number }[] = [];

  // Create hexagon with spade-like patterns
  const sides = 6;
  const hexagonRadius = maxRadius;
  const angleStep = 360 / sides;

  let nailIndex = 0;

  // Outer hexagon nails
  for (let side = 0; side < sides; side++) {
    const sideAngle = side * angleStep + rotation;
    for (let i = 0; i < nailCount; i++) {
      const angle = sideAngle + (i * angleStep) / nailCount;
      const nailRadius = hexagonRadius * (1 - (i / nailCount) * 0.3);
      nails.push({
        point: polarToCartesian(center, nailRadius, angle),
        number: nailIndex++,
      });
    }
  }

  // Inner triangles forming spade shapes
  const depth = Math.floor(density * nailCount / 10);
  for (let tile = 0; tile < 6; tile++) {
    const tileAngle = tile * 60 + rotation;
    const triangleCenter: Coordinates = {
      x: center.x + (hexagonRadius * 0.6) * Math.cos(tileAngle * Math.PI / 180),
      y: center.y + (hexagonRadius * 0.6) * Math.sin(tileAngle * Math.PI / 180),
    };

    for (let side = 0; side < 3; side++) {
      const startAngle = tileAngle + side * 120;
      for (let d = 0; d < depth; d++) {
        const fromRadius = hexagonRadius * 0.4 * (d / depth);
        const toRadius = hexagonRadius * 0.4 * ((d + 1) / depth);

        const fromPoint = polarToCartesian(triangleCenter, fromRadius, startAngle);
        const toPoint = polarToCartesian(triangleCenter, toRadius, startAngle + 120);

        const fromIdx = nailIndex;
        nails.push({ point: fromPoint, number: nailIndex++ });
        const toIdx = nailIndex;
        nails.push({ point: toPoint, number: nailIndex++ });

        lines.push({ from: fromIdx, to: toIdx, color: lineColor });
      }
    }
  }

  return {
    id: 'hexagon_spades',
    name: 'Hexagon Spades',
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
