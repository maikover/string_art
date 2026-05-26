import type { Pattern, PatternLine } from '@/types/stringart';

export interface StarConfig {
  sides?: number;
  points?: number;
  nailCount?: number;
}

export function generateStarPattern(
  width: number,
  height: number,
  config: StarConfig = {}
): Pattern {
  const sides = config.sides ?? 5;
  const points = config.points ?? 5;
  const nailCount = config.nailCount ?? 100;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 10;
  const perSide = Math.floor(nailCount / sides);

  const nails = [];
  for (let s = 0; s < sides; s++) {
    for (let i = 0; i < perSide; i++) {
      const angle = (s / sides) * Math.PI * 2 - Math.PI / 2;
      const r = radius * (0.3 + 0.7 * (i / perSide));
      nails.push({ point: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }, number: nails.length });
    }
  }

  const lines: PatternLine[] = [];
  for (let s = 0; s < sides; s++) {
    for (let i = 0; i < perSide - 1; i++) {
      lines.push({ from: s * perSide + i, to: s * perSide + i + 1, color: undefined });
    }
    const next = (s + 1) % sides;
    lines.push({ from: s * perSide, to: next * perSide, color: undefined });
    lines.push({ from: s * perSide + Math.floor(perSide / 2), to: next * perSide + Math.floor(perSide / 2), color: undefined });
  }

  return { id: 'star', name: 'Star', nails, lines };
}