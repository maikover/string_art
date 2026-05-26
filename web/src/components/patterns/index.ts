import type { Pattern } from '@/types/stringart';

// Pattern registry - maps pattern ID to generator function
import { generateSpiralPattern } from '@/components/patterns/Spiral';
import { generateStarPattern } from '@/components/patterns/Star';
import { generateMandalaPattern } from '@/components/patterns/Mandala';
import { generateWavePattern } from '@/components/patterns/Wave';
import { generateFlowerPattern } from '@/components/patterns/Flower';
import { generatePolygonPattern } from '@/components/patterns/Polygon';
import { generateSunPattern } from '@/components/patterns/Sun';
import { generateAssymetryPattern } from '@/components/patterns/Assymetry';
import { generateCometPattern } from '@/components/patterns/Comet';
import { generateCrossesPattern } from '@/components/patterns/Crosses';
import { generateDanceOfPlanetsPattern } from '@/components/patterns/DanceOfPlanets';
import { generateEyePattern } from '@/components/patterns/Eye';
import { generateFlowerOfLifePattern } from '@/components/patterns/FlowerOfLife';
import { generateFreestylePattern } from '@/components/patterns/Freestyle';
import { generateHexagonSpadesPattern } from '@/components/patterns/HexagonSpades';
import { generateLotusPattern } from '@/components/patterns/Lotus';
import { generateMaurerRosePattern } from '@/components/patterns/MaurerRose';
import { generateSpiralsPattern } from '@/components/patterns/Spirals';
import { generateStarOfDavidPattern } from '@/components/patterns/StarOfDavid';

export type PatternId =
  | 'spiral'
  | 'star'
  | 'mandala'
  | 'wave'
  | 'flower'
  | 'polygon'
  | 'sun'
  | 'assymetry'
  | 'comet'
  | 'crosses'
  | 'danceOfPlanets'
  | 'eye'
  | 'flowerOfLife'
  | 'freestyle'
  | 'hexagonSpades'
  | 'lotus'
  | 'maurerRose'
  | 'spirals'
  | 'starOfDavid';

export const patternGenerators: Record<PatternId, (w: number, h: number, config: Record<string, unknown>) => Pattern> = {
  spiral: generateSpiralPattern,
  star: generateStarPattern,
  mandala: generateMandalaPattern,
  wave: generateWavePattern,
  flower: generateFlowerPattern,
  polygon: generatePolygonPattern,
  sun: generateSunPattern,
  assymetry: generateAssymetryPattern,
  comet: generateCometPattern,
  crosses: generateCrossesPattern,
  danceOfPlanets: generateDanceOfPlanetsPattern,
  eye: generateEyePattern,
  flowerOfLife: generateFlowerOfLifePattern,
  freestyle: generateFreestylePattern,
  hexagonSpades: generateHexagonSpadesPattern,
  lotus: generateLotusPattern,
  maurerRose: generateMaurerRosePattern,
  spirals: generateSpiralsPattern,
  starOfDavid: generateStarOfDavidPattern,
};

export const patternNames: PatternId[] = [
  'spiral', 'star', 'mandala', 'wave', 'flower',
  'polygon', 'sun', 'assymetry', 'comet', 'crosses',
  'danceOfPlanets', 'eye', 'flowerOfLife', 'freestyle',
  'hexagonSpades', 'lotus', 'maurerRose', 'spirals', 'starOfDavid',
];