import { toJpeg, toPng } from 'html-to-image';

import type { ExportFormat } from '../types/story';

const EXPORT_OPTIONS = {
  backgroundColor: '#07090d',
  cacheBust: true,
  canvasHeight: 1920,
  canvasWidth: 1080,
  pixelRatio: 1,
};

const PREVIEW_READY_TIMEOUT_MS = 10000;

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.download = fileName;
  anchor.href = dataUrl;
  anchor.click();
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.download = fileName;
  anchor.href = objectUrl;
  anchor.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

function normalizePreviewUrl(url: string) {
  return new URL(url, window.location.href).href;
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();

  try {
    await new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Nao foi possivel processar a imagem original.'));
      image.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function convertBlobToPng(blob: Blob) {
  const image = await loadImageFromBlob(blob);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Nao foi possivel converter a imagem original para PNG.');
  }

  context.drawImage(image, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) {
        reject(new Error('Nao foi possivel converter a imagem original para PNG.'));
        return;
      }

      resolve(pngBlob);
    }, 'image/png');
  });
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitForCondition(check: () => boolean, timeoutMs: number, errorMessage: string) {
  const startedAt = performance.now();

  while (!check()) {
    if (performance.now() - startedAt >= timeoutMs) {
      throw new Error(errorMessage);
    }

    await waitForNextFrame();
  }
}

function findPreviewImage(previewNode: HTMLElement) {
  return previewNode.querySelector('.story-preview__car-image') as HTMLImageElement | null;
}

async function waitForPreviewReady(previewNode: HTMLElement, expectedImageUrl?: string | null) {
  const normalizedExpectedImageUrl = expectedImageUrl ? normalizePreviewUrl(expectedImageUrl) : null;

  await waitForCondition(() => {
    const previewImage = findPreviewImage(previewNode);

    if (!previewImage) {
      return normalizedExpectedImageUrl === null;
    }

    if (normalizedExpectedImageUrl) {
      const currentImageUrl = previewImage.currentSrc || previewImage.src;

      if (!currentImageUrl || normalizePreviewUrl(currentImageUrl) !== normalizedExpectedImageUrl) {
        return false;
      }
    }

    return previewImage.complete && previewImage.naturalWidth > 0;
  }, PREVIEW_READY_TIMEOUT_MS, 'A imagem do story demorou demais para carregar.');

  await waitForNextFrame();
  await waitForNextFrame();
}

export async function downloadStory(
  previewNode: HTMLElement,
  format: ExportFormat,
  fileNameBase: string,
  expectedImageUrl?: string | null,
) {
  await waitForPreviewReady(previewNode, expectedImageUrl);

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

export async function downloadOriginalImage(imageUrl: string, fileNameBase: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error('Nao foi possivel baixar a imagem original.');
  }

  const blob = await response.blob();
  const pngBlob = await convertBlobToPng(blob);

  downloadBlob(pngBlob, `${fileNameBase}.png`);
}
