export type RendererType = 'canvas' | 'svg';

export type NailKey = number;
export type NailGroupKey = string | number;

export interface Coordinates {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Nail {
  point: Coordinates;
  number: NailKey;
}

export interface NailOptions {
  color: string;
  radius: number;
}

export interface NailsRenderOptions extends NailOptions {
  fontSize: number;
  renderNumbers?: boolean;
  margin?: number;
  numbersStart?: number;
}

export type ID = string;

export interface CalcOptions {
  size: Dimensions;
}

export interface PatternLine {
  from: NailKey;
  to: NailKey;
  color?: string;
}

export interface Pattern {
  id: string;
  name: string;
  nails: Nail[];
  lines: PatternLine[];
  nailGroups?: Record<NailGroupKey, NailGroupKey>;
  options?: PatternOptions;
}

export interface PatternOptions {
  nailCount?: number;
  nailRadius?: number;
  nailColor?: string;
  lineColor?: string;
  backgroundColor?: string;
}

export interface StringArtConfig {
  renderer: RendererType;
  nailOptions: NailsRenderOptions;
  lineWidth: number;
  showGrid: boolean;
  zoom: number;
  pan: Coordinates;
}
