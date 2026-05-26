'use client';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Pattern } from '@/types/stringart';

export async function exportToPng(
  element: HTMLElement,
  filename = 'stringart.png'
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportToSvg(
  pattern: Pattern,
  width: number,
  height: number,
  filename = 'stringart.svg'
): Promise<void> {
  const lines = pattern.lines
    .map((line) => {
      const from = pattern.nails[line.from];
      const to = pattern.nails[line.to];
      if (!from || !to) return '';
      return `  <line x1="${from.point.x}" y1="${from.point.y}" x2="${to.point.x}" y2="${to.point.y}" stroke="${line.color ?? '#000'}" stroke-width="1"/>`;
    })
    .filter(Boolean)
    .join('\n');

  const nails = pattern.nails
    .map(
      (nail) =>
        `  <circle cx="${nail.point.x}" cy="${nail.point.y}" r="4" fill="#333"/>`
    )
    .join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <g id="lines">
${lines}
  </g>
  <g id="nails">
${nails}
  </g>
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportToPdf(
  element: HTMLElement,
  filename = 'stringart.pdf'
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}