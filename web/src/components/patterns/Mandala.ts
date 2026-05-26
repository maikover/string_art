import type { Pattern, PatternLine } from '@/types/stringart';

export interface MandalaConfig {
  symmetry?: number;
  layers?: number;
  nailCount?: number;
}

export function generateMandalaPattern(
  width: number,
  height: number,
  config: MandalaConfig = {}
): Pattern {
  const symmetry = config.symmetry ?? 12;
  const layers = config.layers ?? 3;
  const nailCount = config.nailCount ?? 150;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 10;

  const nails = [];
  for (let l = 0; l < layers; l++) {
    const layerRadius = radius * ((l + 1) / layers);
    const layerNails = Math.floor(nailCount / layers / symmetry);
    for (let s = 0; s < symmetry; s++) {
      for (let n = 0; n < layerNails; n++) {
        const angle = (s / symmetry) * Math.PI * 2 + (l % 2) * (Math.PI / symmetry);
        const r = layerRadius * (0.5 + 0.5 * (n / layerNails));
        nails.push({ point: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }, number: nails.length });
      }
    }
  }

  const lines: PatternLine[] = [];
  for (let l = 0; l < layers; l++) {
    const layerNails = Math.floor(nailCount / layers / symmetry);
    for (let s = 0; s < symmetry; s++) {
      for (let n = 0; n < layerNails - 1; n++) {
        const from = (l * symmetry + s) * layerNails + n;
        const to = (l * symmetry + s) * layerNails + n + 1;
        if (to < nails.length) lines.push({ from, to, color: undefined });
      }
    }
  }

  return { id: 'mandala', name: 'Mandala', nails, lines };
}