'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StringArtCanvas } from '@/components/editor/StringArtCanvas';
import { Slider } from '@/components/ui/Slider';
import { Select } from '@/components/ui/Select';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Button } from '@/components/ui/Button';
import { patternGenerators, patternNames, type PatternId } from '@/components/patterns/index';
import type { Pattern } from '@/types/stringart';

export const dynamic = 'force-static';

const defaultPattern: PatternId = 'spiral';

export default function EditorPage() {
  const { t } = useTranslation();
  const [patternId, setPatternId] = useState<PatternId>(defaultPattern);
  const [pattern, setPattern] = useState<Pattern>(() =>
    patternGenerators[defaultPattern](500, 500, { nailCount: 200, repetitions: 5 })
  );
  const [config, setConfig] = useState<Record<string, unknown>>({
    nailCount: 200,
    repetitions: 5,
  });
  const [lineColor, setLineColor] = useState('#000');
  const [lineWidth, setLineWidth] = useState(1);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [nailRadius, setNailRadius] = useState(6);
  const [nailColor, setNailColor] = useState('#333');

  function regenerate() {
    const p = patternGenerators[patternId](500, 500, config);
    setPattern(p);
  }

  function handlePatternChange(id: PatternId) {
    setPatternId(id);
    const defaults: Record<PatternId, Record<string, unknown>> = {
      spiral: { nailCount: 200, repetitions: 5 },
      star: { sides: 5, points: 5, nailCount: 100 },
      mandala: { symmetry: 12, layers: 3, nailCount: 150 },
      wave: { nailCount: 100, horizontal: true },
      flower: { sides: 6, n: 40, layers: 2 },
      polygon: { sides: 6, nailCount: 60 },
      sun: { rays: 12, nailCount: 120 },
      assymetry: { nailCount: 100 },
      comet: { nailCount: 100 },
      crosses: { rows: 4, cols: 4, nailCount: 80 },
      danceOfPlanets: { planets: 5, nailCount: 100 },
      eye: { nailCount: 80 },
      flowerOfLife: { circles: 7, nailCount: 120 },
      freestyle: { nailCount: 50 },
      hexagonSpades: { nailCount: 96 },
      lotus: { petals: 8, nailCount: 80 },
      maurerRose: { petals: 6, steps: 360, nailCount: 100 },
      spirals: { nSpirals: 4, nailCount: 100 },
      starOfDavid: { nailCount: 60 },
    };
    setConfig(defaults[id] ?? { nailCount: 100 });
    setPattern(patternGenerators[id](500, 500, defaults[id] ?? { nailCount: 100 }));
  }

  const totalLines = pattern.lines.length;
  const totalNails = pattern.nails.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-4 border-black p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('app.title')}</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r-4 border-black p-4 overflow-y-auto">
          <h2 className="text-lg font-bold tracking-wide mb-4">{t('patterns.title')}</h2>

          <Select
            value={patternId}
            onValueChange={(v) => handlePatternChange(v as PatternId)}
            options={patternNames.map((id) => ({ value: id, label: t(`patterns.${id}`) }))}
          />

          <div className="mt-6 space-y-4">
            {config.nailCount !== undefined && (
              <Slider
                label={t('editor.nailCount')}
                value={config.nailCount as number}
                onValueChange={(v) => setConfig((c) => ({ ...c, nailCount: v }))}
                min={20}
                max={500}
              />
            )}
            {config.repetitions !== undefined && (
              <Slider
                label={t('editor.repetitions')}
                value={config.repetitions as number}
                onValueChange={(v) => setConfig((c) => ({ ...c, repetitions: v }))}
                min={1}
                max={20}
              />
            )}
          </div>

          <div className="mt-6 space-y-4">
            <ColorPicker
              label={t('editor.lineColor')}
              value={lineColor}
              onChange={setLineColor}
            />
            <ColorPicker
              label={t('editor.backgroundColor')}
              value={bgColor}
              onChange={setBgColor}
            />
            <Slider
              label={t('editor.lineWidth')}
              value={lineWidth}
              onValueChange={setLineWidth}
              min={0.5}
              max={5}
              step={0.5}
            />
            <Slider
              label={t('editor.nailRadius')}
              value={nailRadius}
              onValueChange={setNailRadius}
              min={2}
              max={12}
            />
          </div>

          <Button onClick={regenerate} className="w-full mt-6">
            {t('editor.regenerate')}
          </Button>

          <div className="mt-4 text-sm text-gray-500">
            {totalNails} {t('editor.nails')} · {totalLines} {t('editor.lines')}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 flex items-center justify-center p-6 bg-gray-100 overflow-auto">
          <div id="stringart-canvas">
            <StringArtCanvas
              pattern={pattern}
              width={500}
              height={500}
              lineColor={lineColor}
              lineWidth={lineWidth}
              backgroundColor={bgColor}
              nailRadius={nailRadius}
              nailColor={nailColor}
            />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t-4 border-black p-4 flex gap-3">
        <Button
          onClick={() => {
            const canvas = document.querySelector('#stringart-canvas canvas') as HTMLCanvasElement;
            if (canvas) {
              const a = document.createElement('a');
              a.download = 'stringart.png';
              a.href = canvas.toDataURL('image/png');
              a.click();
            }
          }}
        >
          PNG
        </Button>
        <Button
          onClick={() => {
            const p = patternGenerators[patternId](500, 500, config);
            const lines = p.lines.map((line) => {
              const from = p.nails[line.from];
              const to = p.nails[line.to];
              if (!from || !to) return '';
              return `<line x1="${from.point.x}" y1="${from.point.y}" x2="${to.point.x}" y2="${to.point.y}" stroke="${line.color ?? '#000'}" stroke-width="1"/>`;
            }).filter(Boolean).join('\n');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#ffffff"/>
  ${lines}
</svg>`;
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = 'stringart.svg';
            a.href = url;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          SVG
        </Button>
        <Button
          onClick={() => {
            const canvas = document.querySelector('#stringart-canvas canvas') as HTMLCanvasElement;
            if (canvas) {
              import('jspdf').then(({ jsPDF }) => {
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [500, 500] });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 500, 500);
                pdf.save('stringart.pdf');
              });
            }
          }}
        >
          PDF
        </Button>
      </footer>
    </div>
  );
}