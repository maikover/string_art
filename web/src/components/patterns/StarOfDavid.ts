import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface StarOfDavidConfig {
  nailCount?: number;
  density?: number;
  rotation?: number;
  mirrorTiling?: boolean;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateStarOfDavidPattern(
  width: number,
  height: number,
  config: StarOfDavidConfig = {}
): Pattern {
  const {
    nailCount = 50,
    density = 2,
    rotation = 0,
    mirrorTiling = false,
    lineColor = '#ffffff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const maxRadius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];
  const nails: { point: Coordinates; number: number }[] = [];

  const depth = Math.floor(density * nailCount / 10);
  let nailIndex = 0;

  // Create outer hexagon
  const hexagonNailCount = nailCount;
  const hexagonAngleStep = 360 / 6;

  for (let side = 0; side < 6; side++) {
    const sideAngle = side * hexagonAngleStep + rotation;
    for (let i = 0; i < Math.floor(hexagonNailCount / 6); i++) {
      const angle = sideAngle + (i * hexagonAngleStep) / (hexagonNailCount / 6);
      nails.push({
        point: polarToCartesian(center, maxRadius, angle),
        number: nailIndex++,
      });
    }
  }

  // Create inner hexagons and triangles
  const innerRadius = maxRadius * 0.5;
  for (let tile = 0; tile < 6; tile++) {
    const tileAngle = tile * 60 + rotation;
    const direction = mirrorTiling ? (tile % 2 ? -1 : 1) : 1;

    // Triangle
    const triangleCenter: Coordinates = {
      x: center.x + innerRadius * Math.cos(tileAngle * Math.PI / 180),
      y: center.y + innerRadius * Math.sin(tileAngle * Math.PI / 180),
    };

    for (let side = 0; side < 3; side++) {
      const startAngle = tileAngle + side * 120;
      const nextAngle = tileAngle + ((side + 1) % 3) * 120;

      for (let d = 0; d < depth; d++) {
        const progress = d / depth;
        const fromPoint = polarToCartesian(triangleCenter, innerRadius * progress, startAngle);
        const toPoint = polarToCartesian(triangleCenter, innerRadius * progress, nextAngle);

        const fromIdx = nailIndex;
        nails.push({ point: fromPoint, number: nailIndex++ });
        const toIdx = nailIndex;
        nails.push({ point: toPoint, number: nailIndex++ });

        lines.push({ from: fromIdx, to: toIdx, color: lineColor });
      }
    }
  }

  // Connect pattern edges
  const outerNailCount = Math.floor(hexagonNailCount / 6) * 6;
  for (let i = 0; i < outerNailCount; i++) {
    const nextIdx = (i + 1) % outerNailCount;
    lines.push({ from: i, to: nextIdx, color: lineColor });
  }

  return {
    id: 'star_of_david',
    name: 'Star of David',
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
