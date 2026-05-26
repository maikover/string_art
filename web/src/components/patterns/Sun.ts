import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian, getNailPositions } from '@/utils/geometry';

export interface SunConfig {
  sides?: number;
  sideNails?: number;
  layers?: number;
  layerSpread?: number;
  starRadius?: number;
  backdropSize?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateSunPattern(
  width: number,
  height: number,
  config: SunConfig = {}
): Pattern {
  const {
    sides = 16,
    sideNails = 50,
    layers = 4,
    layerSpread = 0.77,
    starRadius = 1,
    backdropSize = 0.26,
    rotation = 0.5,
    lineColor = '#ffffff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const maxRadius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];
  const nails: { point: Coordinates; number: number }[] = [];

  let nailIndex = 0;

  // Create star points
  const angleStep = 360 / sides;
  const starNails: { point: Coordinates; number: number }[] = [];

  for (let layer = 0; layer < layers; layer++) {
    const layerSize = Math.max(1, sideNails - layer * Math.floor((sideNails / layers) * layerSpread));
    for (let side = 0; side < sides; side++) {
      const sideAngle = side * angleStep + rotation;
      for (let i = 0; i < layerSize; i++) {
        const nailRadius = maxRadius * starRadius * (i / layerSize);
        const nailAngle = sideAngle + (i * angleStep) / layerSize;

        const point = polarToCartesian({ x: center.x, y: center.y }, nailRadius, nailAngle);
        starNails.push({ point, number: nailIndex });
        nails.push({ point, number: nailIndex++ });
      }
    }
  }

  // Backdrop circle nails
  const backdropNailsCount = Math.floor(sideNails * backdropSize);
  const backdropRadius = maxRadius * 0.9;
  const backdropNails = getNailPositions(center, backdropRadius, sides);

  for (const nail of backdropNails) {
    nails.push({ point: nail.point, number: nailIndex++ });
  }

  // Connect star sides
  for (let side = 0; side < sides; side++) {
    const nextSide = (side + 1) % sides;
    for (let i = 0; i < sideNails - 1; i++) {
      const currentIdx = side * sideNails + i;
      const nextIdx = side * sideNails + i + 1;
      lines.push({ from: currentIdx, to: nextIdx, color: lineColor });

      // Cross connections to adjacent sides
      const crossIdx = nextSide * sideNails + i;
      lines.push({ from: currentIdx, to: crossIdx, color: lineColor });
    }
  }

  // Connect backdrop
  for (let side = 0; side < sides; side++) {
    const starOffset = side * sideNails;
    const backdropIdx = sideNails * sides + side;

    for (let i = 0; i < backdropNailsCount; i++) {
      const starIdx = starOffset + Math.floor(i * sideNails / backdropNailsCount);
      lines.push({ from: starIdx, to: backdropIdx, color: lineColor });
    }
  }

  return {
    id: 'sun',
    name: 'Sun',
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
