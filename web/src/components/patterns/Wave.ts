import type { Pattern, PatternLine } from '@/types/stringart';

export interface WaveConfig {
  nailCount?: number;
  horizontal?: boolean;
}

export function generateWavePattern(
  width: number,
  height: number,
  config: WaveConfig = {}
): Pattern {
  const nailCount = config.nailCount ?? 100;
  const horizontal = config.horizontal ?? true;
  const axisLen = horizontal ? width : height;
  const crossLen = horizontal ? height : width;
  const cx = width / 2;
  const cy = height / 2;
  const halfAxis = axisLen / 2 - 10;
  const halfCross = crossLen / 2 - 10;

  const nails = [];
  for (let i = 0; i < nailCount; i++) {
    const t = i / (nailCount - 1);
    const x = horizontal ? cx - halfAxis + t * axisLen : cx;
    const y = horizontal ? cy : cy - halfCross + t * crossLen;
    nails.push({ point: { x, y }, number: i });
  }

  const lines: PatternLine[] = [];
  const waves = 3;
  for (let w = 0; w < waves; w++) {
    const phase = w / waves;
    for (let i = 0; i < nailCount; i++) {
      const t = i / (nailCount - 1);
      const from = i;
      const toEncouraged = Math.floor(((t + phase) % 1) * (nailCount - 1));
      const to = i === nailCount - 1 ? 0 : toEncouraged;
      if (from !== to) lines.push({ from, to, color: undefined });
    }
  }

  return { id: 'wave', name: 'Wave', nails, lines };
}