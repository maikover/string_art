import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface FlowerOfLifeConfig {
  levels?: number;
  density?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateFlowerOfLifePattern(
  width: number,
  height: number,
  config: FlowerOfLifeConfig = {}
): Pattern {
  const {
    levels = 3,
    density = 10,
    rotation = 0,
    lineColor = '#29f1ff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const maxRadius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];
  const nails: { point: Coordinates; number: number }[] = [];

  const edgeSize = maxRadius / levels;
  const triangleHeight = (edgeSize * Math.sqrt(3)) / 2;
  const nailDistance = edgeSize / density;

  let nailIndex = 0;

  // Central hexagon
  for (let i = 0; i < 6 * levels; i++) {
    const angle = (i * 60 + rotation) * (Math.PI / 180);
    const nailCount = density * 2;
    for (let d = 1; d <= nailCount; d++) {
      const dist = d * nailDistance;
      const x = center.x + dist * Math.cos(angle);
      const y = center.y + dist * Math.sin(angle);
      nails.push({ point: { x, y }, number: nailIndex++ });
    }
  }

  // Surrounding hexagons
  for (let level = 1; level <= levels; level++) {
    const ringRadius = level * edgeSize;
    const hexagonsInRing = 6 * level;

    for (let h = 0; h < hexagonsInRing; h++) {
      const hexAngle = (h * 60 / level + rotation) * (Math.PI / 180);
      const hexCenter: Coordinates = {
        x: center.x + ringRadius * Math.cos(hexAngle),
        y: center.y + ringRadius * Math.sin(hexAngle),
      };

      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 + rotation) * (Math.PI / 180);
        const nailCount = density * 2;
        for (let d = 1; d <= nailCount; d++) {
          const dist = d * nailDistance;
          const x = hexCenter.x + dist * Math.cos(angle);
          const y = hexCenter.y + dist * Math.sin(angle);
          nails.push({ point: { x, y }, number: nailIndex++ });
        }
      }
    }
  }

  // Connect Flower of Life pattern
  const PI2 = Math.PI * 2;
  for (let level = 0; level <= levels; level++) {
    const levelRadius = level * triangleHeight;
    const hexCount = level === 0 ? 1 : 6 * level;

    for (let h = 0; h < hexCount; h++) {
      const hexAngle = h * PI2 / hexCount + rotation * PI2 / 360;
      const hexCenter: Coordinates = {
        x: center.x + levelRadius * Math.cos(hexAngle),
        y: center.y + levelRadius * Math.sin(hexAngle),
      };

      // Draw hexagon edges
      for (let side = 0; side < 6; side++) {
        const startAngle = side * 60 * (Math.PI / 180) + rotation * PI2 / 360;
        const endAngle = (side + 1) * 60 * (Math.PI / 180) + rotation * PI2 / 360;

        for (let d = 0; d < density * 2; d++) {
          const from: Coordinates = {
            x: hexCenter.x + (d * nailDistance) * Math.cos(startAngle),
            y: hexCenter.y + (d * nailDistance) * Math.sin(startAngle),
          };
          const to: Coordinates = {
            x: hexCenter.x + (d * nailDistance) * Math.cos(endAngle),
            y: hexCenter.y + (d * nailDistance) * Math.sin(endAngle),
          };

          // Find nail indices (simplified - in real impl would need proper mapping)
          const fromIdx = nails.findIndex(n => Math.abs(n.point.x - from.x) < 0.1 && Math.abs(n.point.y - from.y) < 0.1);
          const toIdx = nails.findIndex(n => Math.abs(n.point.x - to.x) < 0.1 && Math.abs(n.point.y - to.y) < 0.1);

          if (fromIdx >= 0 && toIdx >= 0) {
            lines.push({ from: fromIdx, to: toIdx, color: lineColor });
          }
        }
      }
    }
  }

  return {
    id: 'flower_of_life',
    name: 'Flower of Life',
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
