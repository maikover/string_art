import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Pattern,
  RendererType,
  NailsRenderOptions,
  Coordinates,
  NailOptions,
} from '@/types/stringart';

interface EditorState {
  // Pattern
  activePattern: Pattern | null;
  setActivePattern: (pattern: Pattern | null) => void;

  // Renderer
  renderer: RendererType;
  setRenderer: (r: RendererType) => void;

  // Nail options
  nailOptions: NailOptions & { fontSize: number; renderNumbers: boolean };
  setNailOptions: (opts: Partial<NailOptions & { fontSize: number; renderNumbers: boolean }>) => void;

  // Line
  lineColor: string;
  lineWidth: number;
  setLineColor: (c: string) => void;
  setLineWidth: (w: number) => void;

  // Background
  backgroundColor: string;
  setBackgroundColor: (c: string) => void;

  // Grid
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;

  // Zoom/Pan
  zoom: number;
  pan: Coordinates;
  setZoom: (z: number) => void;
  setPan: (p: Coordinates) => void;

  // History
  history: Pattern[];
  historyIndex: number;
  pushHistory: (pattern: Pattern) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      activePattern: null,
      setActivePattern: (pattern) => set({ activePattern: pattern }),

      renderer: 'canvas',
      setRenderer: (renderer) => set({ renderer }),

      nailOptions: {
        color: '#333',
        radius: 6,
        fontSize: 10,
        renderNumbers: true,
      },
      setNailOptions: (opts) =>
        set((s) => ({ nailOptions: { ...s.nailOptions, ...opts } })),

      lineColor: '#000',
      lineWidth: 1,
      setLineColor: (lineColor) => set({ lineColor }),
      setLineWidth: (lineWidth) => set({ lineWidth }),

      backgroundColor: '#fff',
      setBackgroundColor: (backgroundColor) => set({ backgroundColor }),

      showGrid: false,
      setShowGrid: (showGrid) => set({ showGrid }),

      zoom: 1,
      pan: { x: 0, y: 0 },
      setZoom: (zoom) => set({ zoom }),
      setPan: (pan) => set({ pan }),

      history: [],
      historyIndex: -1,
      pushHistory: (pattern) =>
        set((s) => {
          const newHistory = s.history.slice(0, s.historyIndex + 1);
          newHistory.push(pattern);
          return { history: newHistory, historyIndex: newHistory.length - 1 };
        }),
      undo: () =>
        set((s) => {
          if (s.historyIndex <= 0) return s;
          const newIndex = s.historyIndex - 1;
          return { historyIndex: newIndex, activePattern: s.history[newIndex] };
        }),
      redo: () =>
        set((s) => {
          if (s.historyIndex >= s.history.length - 1) return s;
          const newIndex = s.historyIndex + 1;
          return { historyIndex: newIndex, activePattern: s.history[newIndex] };
        }),
    }),
    {
      name: 'stringart-editor',
      partialize: (s) => ({
        renderer: s.renderer,
        lineColor: s.lineColor,
        lineWidth: s.lineWidth,
        backgroundColor: s.backgroundColor,
        showGrid: s.showGrid,
        nailOptions: s.nailOptions,
      }),
    }
  )
);
