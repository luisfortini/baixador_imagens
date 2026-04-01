import { toJpeg, toPng } from 'html-to-image';

import type { ExportFormat } from '../types/story';

const EXPORT_OPTIONS = {
  backgroundColor: '#07090d',
  cacheBust: true,
  canvasHeight: 1920,
  canvasWidth: 1080,
  pixelRatio: 1,
};

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.download = fileName;
  anchor.href = dataUrl;
  anchor.click();
}

export async function downloadStory(previewNode: HTMLElement, format: ExportFormat, fileNameBase: string) {
  if (format === 'jpg') {
    const dataUrl = await toJpeg(previewNode, {
      ...EXPORT_OPTIONS,
      quality: 0.96,
    });

    downloadDataUrl(dataUrl, `${fileNameBase}.jpg`);
    return;
  }

  const dataUrl = await toPng(previewNode, EXPORT_OPTIONS);
  downloadDataUrl(dataUrl, `${fileNameBase}.png`);
}
