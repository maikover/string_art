import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian, getNailPositions } from '@/utils/geometry';

export interface LotusConfig {
  sides?: number;
  density?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateLotusPattern(
  width: number,
  height: number,
  config: LotusConfig = {}
): Pattern {
  const {
    sides = 18,
    density = 15,
    rotation = 0,
    lineColor = '#ffffff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const maxRadius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];
  const nails: { point: Coordinates; number: number }[] = [];

  const sideAngle = 360 / sides;
  const densityNailCount = density * sides;

  // Create circles around center to form lotus petals
  let nailIndex = 0;

  // Center nail
  nails.push({ point: center, number: nailIndex++ });

  // Petal circles
  for (let i = 0; i < sides; i++) {
    const petalAngle = i * sideAngle + rotation;
    const petalCenter: Coordinates = {
      x: center.x + (maxRadius * 0.5) * Math.cos(petalAngle * Math.PI / 180),
      y: center.y + (maxRadius * 0.5) * Math.sin(petalAngle * Math.PI / 180),
    };

    const petalNails = getNailPositions(petalCenter, maxRadius * 0.4, density);
    for (const nail of petalNails) {
      nails.push({ point: nail.point, number: nailIndex++ });
    }
  }

  // Connect petals in lotus pattern
  for (let side = 0; side < sides; side++) {
    const nextSide = (side + 1) % sides;

    // Connect outer petals
    for (let d = 0; d < density; d++) {
      const fromIdx = 1 + side * density + d;
      const toIdx = 1 + side * density + ((d + 1) % density);
      lines.push({ from: fromIdx, to: toIdx, color: lineColor });
    }

    // Connect to center
    lines.push({ from: 0, to: 1 + side * density, color: lineColor });
  }

  // Cross connections between adjacent petals
  for (let side = 0; side < sides; side++) {
    const nextSide = (side + 1) % sides;
    for (let d = 0; d < density; d++) {
      const fromIdx = 1 + side * density + d;
      const toIdx = 1 + nextSide * density + (density - 1 - d);
      lines.push({ from: fromIdx, to: toIdx, color: lineColor });
    }
  }

  return {
    id: 'lotus',
    name: 'Lotus',
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
