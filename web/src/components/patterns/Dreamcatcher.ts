import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface DreamcatcherConfig {
  nailCount?: number;
  petals?: number;
  amplitude?: number;
  layers?: number;
  reverse?: boolean;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateDreamcatcherPattern(
  width: number,
  height: number,
  config: DreamcatcherConfig = {}
): Pattern {
  const {
    nailCount = 170,
    petals = 10,
    amplitude = 59,
    layers = 5,
    reverse = false,
    lineColor = '#b000ff',
    nailColor = '#333',
    backgroundColor = '#ffffff',
  } = config;

  const center: Coordinates = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2 - 20;

  // Create circle nails
  const nails: { point: Coordinates; number: number }[] = [];
  for (let i = 0; i < nailCount; i++) {
    const angle = (i * 360) / nailCount;
    nails.push({
      point: polarToCartesian(center, radius, angle),
      number: i,
    });
  }

  const lines: PatternLine[] = [];
  const maxOffsetBase = (amplitude / 100) * nailCount;

  for (let L = 0; L < layers; L++) {
    const currentMaxOffset = maxOffsetBase * (1 - L * 0.05);
    // Simulate backend color spectrum starting from blue/purple
    const hue = (200 + (L / layers) * 200) % 360;
    const layerColor = `hsl(${hue}, 100%, 60%)`;

    for (let i = 0; i < nailCount; i++) {
      const angle = i * Math.PI * 2 / nailCount;
      const offset = Math.round(currentMaxOffset * Math.sin(petals * angle));
      const target = ((i + offset) % nailCount + nailCount) % nailCount;

      lines.push({ from: i, to: target, color: layerColor });
    }
  }

  return {
    id: 'dreamcatcher',
    name: 'Loto Místico',
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
