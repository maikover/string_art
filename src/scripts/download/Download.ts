import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { lengthConvert, sizeConvert } from '../helpers/size_utils';
import CanvasRenderer from '../infra/renderers/CanvasRenderer';
import SVGRenderer from '../infra/renderers/SVGRenderer';
import StringArt from '../infra/StringArt';
import { CommonConfig } from '../types/config.types';
import { Dimensions, LengthUnit, SizeUnit } from '../types/general.types';
import { RendererType } from '../types/stringart.types';

interface DownloadData {
  data: Blob;
  filename: string;
}

export interface DownloadResult {
  success: boolean;
  filename: string;
  location: string; // human-readable location
  uri?: string; // file URI (Android only)
}

export type ImageType = 'png' | 'jpeg' | 'webp' | 'video';
export interface DownloadPatternOptions {
  size: Dimensions;
  units?: SizeUnit;
  dpi?: number;
  filename?: string;
  isNailsMap?: boolean;
  includeNailNumbers?: boolean;
  type?: RendererType;
  imageType?: ImageType;
  margin?: number;
  enableBackground?: boolean;
  sizeId?: string;
  isRotated?: boolean;
}

const SAVE_SUBDIR = 'StringArt Studio';

function isAndroidNative(): boolean {
  return typeof Capacitor !== 'undefined'
    && Capacitor.isNativePlatform?.()
    && Capacitor.getPlatform?.() === 'android';
}

// Convert a Blob to base64 (without the data: URL prefix)
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result is "data:<mime>;base64,<payload>" — strip the prefix
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadFile({ data, filename }: DownloadData): Promise<DownloadResult> {
  const isNative = isAndroidNative();
  
  if (isNative) {
    try {
      const base64 = await blobToBase64(data);
      const writeResult = await Filesystem.writeFile({
        path: `${SAVE_SUBDIR}/${filename}`,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });

      const result: DownloadResult = {
        success: true,
        filename,
        location: `Cache/${SAVE_SUBDIR}`,
        uri: writeResult.uri,
      };

      // Try to open the file automatically on Android
      if (writeResult.uri) {
        await openFileOnAndroid(writeResult.uri);
      }

      return result;
    } catch (err: any) {
      // Fall back to the web method if the plugin fails for any reason
      console.error('[Download] Filesystem write failed:', err);
      // fall through to web download
    }
  }

  // Web fallback (and Android fallback) — works on desktop, iOS, and modern Android WebViews
  const dataUrl = URL.createObjectURL(data);
  const downloadLink = document.createElement('a');
  downloadLink.href = dataUrl;
  downloadLink.download = filename;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  // Give the browser a moment to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);

  return {
    success: true,
    filename,
    location: isAndroidNative() ? 'Downloads del navegador' : 'Carpeta de descargas',
  };
}

export async function downloadTextFile(
  contents: string,
  filename: string,
  mimeType = 'text/plain'
): Promise<DownloadResult> {
  const data = new Blob([contents], { type: mimeType });
  return downloadFile({ data, filename });
}

export async function downloadPattern(
  pattern: StringArt,
  { type, ...options }: DownloadPatternOptions
): Promise<DownloadResult> {
  const overridingConfig = getConfigForDownloadOptions(options);
  if (overridingConfig) {
    pattern = pattern.copy();
    pattern.assignConfig(overridingConfig);
  }

  if (options.units) {
    options = {
      ...options,
      size: sizeConvert(options.size, options.units, 'px', options.dpi),
    };
  }

  let downloadData;
  if (type === 'svg') {
    downloadData = patternToSVGDownloadData(pattern, options);
  } else if (options.imageType === 'video' || type === ('video' as any)) {
    downloadData = await patternToVideoDownloadData(pattern, options);
  } else {
    downloadData = await patternToImageDownloadData(pattern, options);
  }
  return downloadFile(downloadData);
}

export function getConfigForDownloadOptions(
  options: DownloadPatternOptions
): Partial<CommonConfig> | null {
  const config: Partial<CommonConfig> = {};

  if (options.margin) {
    config.margin = lengthConvert(
      options.margin,
      options.units ?? 'px',
      'px',
      options.dpi
    );
  }

  if (options.isNailsMap) {
    Object.assign(config, {
      darkMode: false,
      showNails: true,
      showNailNumbers: options.includeNailNumbers,
      showStrings: false,
      nailsColor: '#000000',
      backgroundColor: '#ffffff',
      customBackgroundColor: true,
    });
  }

  if (options.enableBackground != null) {
    Object.assign(config, {
      enableBackground: options.enableBackground,
    });
  }

  return Object.keys(config).length === 0 ? null : config;
}

async function patternToImageDownloadData(
  pattern: StringArt,
  {
    size,
    filename,
    imageType,
  }: { size: Dimensions; filename?: string; imageType?: ImageType }
): Promise<DownloadData> {
  const parentElement = document.createElement('article');
  const renderer = new CanvasRenderer(parentElement, { updateOnResize: false });

  renderer.disablePixelRatio();
  renderer.setFixedSize(size);

  pattern.draw(renderer);

  return {
    data: await renderer.toBlob(imageType),
    filename: `${filename ?? pattern.name}.${imageType ?? 'png'}`,
  };
}

function patternToSVGDownloadData(
  pattern: StringArt,
  { size, filename }: { size: Dimensions; filename?: string }
): DownloadData {
  const parentEl = document.createElement('article');
  parentEl.style.width = size[0] + 'px';
  parentEl.style.height = size[1] + 'px';
  document.body.appendChild(parentEl);
  const renderer = new SVGRenderer(parentEl);
  renderer.setFixedSize(size);
  pattern.draw(renderer);

  const svgData = renderer.svg.outerHTML;
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  return {
    data: svgBlob,
    filename: filename ?? pattern.name + '.svg',
  };
}

// Open a file with the default viewer/app on Android using Capacitor Share
async function openFileOnAndroid(uri: string): Promise<void> {
  try {
    // Share.share on Android handles file:// URIs securely via FileProvider
    await Share.share({
      title: 'String Art',
      url: uri,
      dialogTitle: 'Abrir o guardar archivo'
    });
  } catch (err) {
    console.warn('[Download] Failed to auto-open file:', err);
    // Silently fail — file is saved, user can open manually
  }
}

async function patternToVideoDownloadData(
  pattern: StringArt,
  { size, filename }: { size: Dimensions; filename?: string }
): Promise<DownloadData> {
  const parentElement = document.createElement('article');
  const renderer = new CanvasRenderer(parentElement, { updateOnResize: false });
  renderer.disablePixelRatio();
  renderer.setFixedSize(size);

  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = size[0];
  compositeCanvas.height = size[1];
  const ctx = compositeCanvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to create 2d context for video export');
  }

  // Draw background and nails first
  pattern.draw(renderer, { redrawStrings: false });
  ctx.drawImage(renderer.getComposite(), 0, 0);

  const stream = compositeCanvas.captureStream(30);
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];

  mediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      resolve({
        data: new Blob(chunks, { type: 'video/webm' }),
        filename: `${filename ?? pattern.name}.webm`,
      });
    };

    mediaRecorder.start();

    // Iterate through strings drawing
    let position = 1;
    const stepCount = pattern.getStepCount({ size });

    // Target a maximum of 300 frames (10 seconds at 30 fps) so it doesn't take forever
    const stepsPerFrame = Math.max(1, Math.ceil(stepCount / 300));

    function renderNextFrame() {
      position = Math.min(stepCount, position + stepsPerFrame);
      pattern.goto(renderer, position, { showInstructions: false });
      ctx!.drawImage(renderer.getComposite(), 0, 0);

      if (position < stepCount) {
        // Use setTimeout to yield to the event loop so MediaRecorder captures the frame
        setTimeout(renderNextFrame, 1000 / 30); 
      } else {
        // give it a small delay at the end
        setTimeout(() => mediaRecorder.stop(), 500);
      }
    }

    renderNextFrame();
  });
}