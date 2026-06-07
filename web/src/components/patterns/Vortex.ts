import type { Pattern, PatternLine, Coordinates } from '@/types/stringart';
import { polarToCartesian } from '@/utils/geometry';

export interface VortexConfig {
  nailCount?: number;
  layers?: number;
  layerFill?: number;
  layerSpread?: number;
  vortexIntensity?: number;
  reverse?: boolean;
  lineColor?: string;
  nailColor?: string;
  backgroundColor?: string;
}

export function generateVortexPattern(
  width: number,
  height: number,
  config: VortexConfig = {}
): Pattern {
  const {
    nailCount = 44, // Matched to user screenshot
    layers = 15,
    layerFill = 0.5,
    layerSpread = 0, // Matched to user screenshot
    vortexIntensity = 1.1, // Matched to user screenshot
    reverse = false,
    lineColor = '#ff0055',
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
  const direction = reverse ? -1 : 1;
  const stringsPerLayer = Math.floor(nailCount * layerFill);
  const layerShift = Math.round(nailCount * layerSpread);

  const minStep = Math.max(1, Math.floor(nailCount * 0.02));
  const maxStep = Math.max(minStep + 1, Math.floor(nailCount * 0.48));

  for (let layer = 0; layer < layers; layer++) {
    const t = layers > 1 ? layer / (layers - 1) : 0;
    const easedT = Math.pow(t, vortexIntensity);
    
    const step = Math.floor(maxStep - (maxStep - minStep) * easedT);

    let shift = Math.round(layerShift * layer * direction);
    shift = ((shift % nailCount) + nailCount) % nailCount;

    let currentNail = shift;
    
    // Simulate the backend color spectrum
    const hue = (200 + (layer / layers) * 200) % 360;
    const layerColor = `hsl(${hue}, 100%, 60%)`;

    for (let i = 0; i < stringsPerLayer; i++) {
      const pos1 = (i + shift) % nailCount;
      const pos2 = ((pos1 + step) % nailCount + nailCount) % nailCount;

      if (i > 0) {
        lines.push({ from: currentNail, to: pos1, color: layerColor });
        currentNail = pos1;
      }
      lines.push({ from: currentNail, to: pos2, color: layerColor });
      currentNail = pos2;
    }
  }

  return {
    id: 'vortex',
    name: 'Anillos Desfasados',
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
