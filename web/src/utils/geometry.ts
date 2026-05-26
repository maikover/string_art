import type { Coordinates, Dimensions, Nail } from '@/types/stringart';

export function polarToCartesian(
  center: Coordinates,
  radius: number,
  angleInDegrees: number
): Coordinates {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: center.x + radius * Math.cos(angleInRadians),
    y: center.y + radius * Math.sin(angleInRadians),
  };
}

export function getNailPositions(
  center: Coordinates,
  radius: number,
  nailCount: number
): Nail[] {
  const angleStep = 360 / nailCount;
  return Array.from({ length: nailCount }, (_, i) => {
    const angle = i * angleStep;
    return {
      point: polarToCartesian(center, radius, angle),
      number: i,
    };
  });
}

export function distance(a: Coordinates, b: Coordinates): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

export function midpoint(a: Coordinates, b: Coordinates): Coordinates {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getCircularCanvasDimensions(
  canvasWidth: number,
  canvasHeight: number
): { center: Coordinates; radius: number } {
  const center: Coordinates = {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
  };
  const radius = Math.min(canvasWidth, canvasHeight) / 2 - 10;
  return { center, radius };
}
