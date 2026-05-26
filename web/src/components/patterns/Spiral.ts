import type { Pattern, PatternLine } from '@/types/stringart';

export interface SpiralConfig {
  nailCount?: number;
  repetitions?: number;
}

export function generateSpiralPattern(
  width: number,
  height: number,
  config: SpiralConfig = {}
): Pattern {
  const nailCount = config.nailCount ?? 200;
  const repetitions = config.repetitions ?? 5;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 10;

  const nails = [];
  for (let i = 0; i < nailCount; i++) {
    const angle = (i / nailCount) * Math.PI * 2;
    const t = i / nailCount;
    const radius = maxRadius * (0.1 + 0.9 * Math.pow(t, 0.6));
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    nails.push({ point: { x, y }, number: i });
  }

  const lines: PatternLine[] = [];
  for (let r = 0; r < repetitions; r++) {
    const step = nailCount / repetitions;
    for (let i = 0; i < nailCount; i++) {
      const from = i;
      const base = Math.floor((i * (nailCount + 1)) / nailCount);
      const to = Math.floor((i + step) % nailCount);
      if (from !== to) {
        lines.push({ from, to, color: undefined });
      }
    }
  }

  return { id: 'spiral', name: 'Spiral', nails, lines };
}