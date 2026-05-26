import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface EyeConfig {
  sides?: number;
  nailCount?: number;
  layers?: number;
  angle?: number;
  rotation?: number;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateEyePattern(
  width: number,
  height: number,
  config: EyeConfig = {}
): Pattern {
  const {
    sides = 4,
    nailCount = 82,
    layers = 13,
    angle = 0.65,
    rotation = 0,
    lineColor = '#ffffff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2 - 20;
  const angleStep = 360 / sides;
  const lines: PatternLine[] = [];

  // Create polygon nail positions
  const totalNails = sides * (nailCount - 1);
  const nails: { point: Coordinates; number: number }[] = [];

  for (let side = 0; side < sides; side++) {
    const sideAngle = side * angleStep + rotation * 360;
    for (let i = 0; i < nailCount - 1; i++) {
      const nailIndex = side * (nailCount - 1) + i;
      const nailAngle = sideAngle + (i * angleStep) / (nailCount - 1);
      nails.push({
        point: polarToCartesian(center, radius, nailAngle),
        number: nailIndex,
      });
    }
  }

  // Connect adjacent polygons forming eye-like pattern
  const layersCount = Math.min(layers, Math.floor((nailCount - 1) * angle));
  const sizeReduction = 1 / layersCount;

  for (let layer = 0; layer < layersCount; layer++) {
    const layerRadius = radius * (1 - sizeReduction * (layer + 1));
    const layerNails: { point: Coordinates; number: number }[] = [];

    for (let side = 0; side < sides; side++) {
      const sideAngle = side * angleStep + rotation * 360;
      for (let i = 0; i < nailCount - 1; i++) {
        const nailIndex = totalNails + layer * sides * (nailCount - 1) + side * (nailCount - 1) + i;
        const nailAngle = sideAngle + (i * angleStep) / (nailCount - 1);
        layerNails.push({
          point: polarToCartesian(center, layerRadius, nailAngle),
          number: nailIndex,
        });
      }
    }

    nails.push(...layerNails);

    // Connect current layer to previous (or outer circle for first layer)
    const prevLayerNails = layer === 0 ? nails.slice(0, totalNails) : nails.slice(totalNails, totalNails + layer * sides * (nailCount - 1));
    const currentOffset = totalNails + layer * sides * (nailCount - 1);

    for (let side = 0; side < sides; side++) {
      for (let i = 0; i < nailCount - 2; i++) {
        const currentIndex = currentOffset + side * (nailCount - 1) + i;
        const prevIndex = layer === 0
          ? side * (nailCount - 1) + i
          : totalNails + (layer - 1) * sides * (nailCount - 1) + side * (nailCount - 1) + i;
        lines.push({ from: prevIndex, to: currentIndex, color: lineColor });
      }
    }
  }

  return {
    id: 'eye',
    name: 'Eye',
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
