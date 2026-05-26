import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface PolygonConfig {
  sides?: number;
  nailCount?: number;
  bezier?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generatePolygonPattern(
  width: number,
  height: number,
  config: PolygonConfig = {}
): Pattern {
  const {
    sides = 5,
    nailCount = 60,
    bezier = 2,
    rotation = 0,
    lineColor = '#ff0000',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const maxRadius = Math.min(width, height) / 2 - 20;
  const lines: PatternLine[] = [];
  const nails: { point: Coordinates; number: number }[] = [];

  const angleStep = 360 / sides;
  const limitedBezier = Math.min(bezier, Math.ceil(sides / 2) - 1);

  // Create polygon nail positions
  for (let side = 0; side < sides; side++) {
    const sideStartAngle = side * angleStep + rotation;
    const sideEndAngle = (side + 1) * angleStep + rotation;

    for (let i = 0; i < nailCount - 1; i++) {
      const progress = i / (nailCount - 1);

      // Bezier curve interpolation for intermediate points
      const angle = sideStartAngle + progress * angleStep;
      const nailRadius = maxRadius * (1 - (Math.abs(progress - 0.5) * 0.1));

      nails.push({
        point: polarToCartesian(center, nailRadius, angle),
        number: side * (nailCount - 1) + i,
      });
    }
  }

  // Connect polygon sides with bezier-like connections
  for (let side = 0; side < sides; side++) {
    const nextSide = (side + limitedBezier) % sides;

    for (let i = 0; i < nailCount - 1; i++) {
      const currentIdx = side * (nailCount - 1) + i;
      const targetIdx = nextSide * (nailCount - 1) + i;
      lines.push({ from: currentIdx, to: targetIdx, color: lineColor });

      if (i > 0) {
        const prevIdx = side * (nailCount - 1) + (i - 1);
        lines.push({ from: currentIdx, to: prevIdx, color: lineColor });
      }
    }
  }

  return {
    id: 'polygon' ,
    name: 'Polygon',
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
