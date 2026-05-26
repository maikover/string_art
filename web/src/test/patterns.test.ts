import { describe, it, expect } from 'vitest';
import { generateSpiralPattern } from '@/components/patterns/Spiral';

describe('Spiral pattern', () => {
  it('generates pattern with correct nail count', () => {
    const pattern = generateSpiralPattern(500, 500, { nailCount: 100 });
    expect(pattern.nails.length).toBe(100);
  });

  it('generates lines', () => {
    const pattern = generateSpiralPattern(500, 500, { nailCount: 50 });
    expect(pattern.lines.length).toBeGreaterThan(0);
  });

  it('has valid nail coordinates', () => {
    const pattern = generateSpiralPattern(500, 500, { nailCount: 50 });
    pattern.nails.forEach((nail) => {
      expect(typeof nail.point.x).toBe('number');
      expect(typeof nail.point.y).toBe('number');
      expect(typeof nail.number).toBe('number');
    });
  });

  it('referenced nails are within bounds', () => {
    const pattern = generateSpiralPattern(500, 500, { nailCount: 50 });
    const nailCount = pattern.nails.length;
    pattern.lines.forEach((line) => {
      expect(line.from).toBeLessThan(nailCount);
      expect(line.to).toBeLessThan(nailCount);
    });
  });
});

describe('Pattern registry', () => {
  it('can import pattern index', async () => {
    const mod = await import('@/components/patterns/index');
    expect(mod.patternGenerators).toBeDefined();
    expect(Object.keys(mod.patternGenerators).length).toBe(19);
  });
});