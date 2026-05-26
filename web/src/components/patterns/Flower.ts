import type { Pattern, PatternLine } from '@/types/stringart';

export interface FlowerConfig {
  sides?: number;
  n?: number;
  layers?: number;
}

export function generateFlowerPattern(
  width: number,
  height: number,
  config: FlowerConfig = {}
): Pattern {
  const sides = config.sides ?? 6;
  const n = config.n ?? 40;
  const layers = config.layers ?? 2;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 10;

  const nails = [];
  for (let l = 0; l < layers; l++) {
    const layerRadius = maxRadius * ((l + 1) / layers);
    for (let s = 0; s < sides; s++) {
      for (let i = 0; i < n; i++) {
        const angle = (s / sides) * Math.PI * 2 + (i / n) * (Math.PI * 2 / sides);
        const r = layerRadius * (0.3 + 0.7 * (i / n));
        nails.push({ point: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }, number: nails.length });
      }
    }
  }

  const lines: PatternLine[] = [];
  for (let l = 0; l < layers; l++) {
    for (let s = 0; s < sides; s++) {
      for (let i = 0; i < n - 1; i++) {
        const from = (l * sides + s) * n + i;
        const to = (l * sides + s) * n + i + 1;
        if (to < nails.length) lines.push({ from, to, color: undefined });
      }
    }
  }

  return { id: 'flower', name: 'Flower', nails, lines };
}