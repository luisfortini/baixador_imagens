import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import axios from 'axios';
import fs from 'fs-extra';

import { withRetries } from '../utils/scraperUtils.js';

const CONTENT_TYPE_TO_EXTENSION = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function inferExtension(imageUrl, headers = {}) {
  const contentType = String(headers['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (CONTENT_TYPE_TO_EXTENSION[contentType]) {
    return CONTENT_TYPE_TO_EXTENSION[contentType];
  }

  try {
    return path.extname(new URL(imageUrl).pathname) || '.jpg';
  } catch {
    return '.jpg';
  }
}

async function hasNonEmptyFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

function getReusableFile(existingMetadata, imageUrl, index) {
  const previousUrls = Array.isArray(existingMetadata?.sourceImageUrls)
    ? existingMetadata.sourceImageUrls
    : [];
  const previousFiles = Array.isArray(existingMetadata?.savedFiles)
    ? existingMetadata.savedFiles
    : [];

  if (previousUrls[index] !== imageUrl) {
    return null;
  }

  return previousFiles[index] || null;
}

export function createHttpClient({ userAgent, timeoutMs }) {
  return axios.create({
    timeout: timeoutMs,
    maxRedirects: 5,
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/*,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': userAgent,
    },
    validateStatus: () => true,
  });
}

export async function fetchHtml(client, url, logger) {
  const response = await withRetries(
    async () => {
      const current = await client.get(url, { responseType: 'text' });

      if (current.status >= 400) {
        throw new Error(`HTTP ${current.status}`);
      }

      return current;
    },
    {
      retries: 2,
      delayMs: 1_250,
      onRetry: async (error, attempt) => {
        logger.warn(`Nova tentativa HTTP para ${url} (tentativa ${attempt + 2}): ${error.message}`);
      },
    },
  );

  return String(response.data);
}

export async function loadVehicleMetadata(vehicleDir) {
  const metadataPath = path.join(vehicleDir, 'metadata.json');

  if (!(await fs.pathExists(metadataPath))) {
    return null;
  }

  try {
    return await fs.readJson(metadataPath);
  } catch {
    return null;
  }
}

export async function canReuseExistingVehicle(vehicleDir, existingMetadata, imageUrls) {
  if (!existingMetadata) {
    return false;
  }

  const previousUrls = Array.isArray(existingMetadata.sourceImageUrls)
    ? existingMetadata.sourceImageUrls
    : [];
  const previousFiles = Array.isArray(existingMetadata.savedFiles)
    ? existingMetadata.savedFiles
    : [];

  if (previousUrls.length !== imageUrls.length || !previousFiles.length) {
    return false;
  }

  for (let index = 0; index < imageUrls.length; index += 1) {
    if (previousUrls[index] !== imageUrls[index]) {
      return false;
    }
  }

  const checks = await Promise.all(
    previousFiles.map((fileName) => hasNonEmptyFile(path.join(vehicleDir, fileName))),
  );

  return checks.every(Boolean);
}

async function downloadSingleImage({ client, imageUrl, outputPath, vehicleUrl }) {
  const response = await withRetries(
    async () => {
      const current = await client.get(imageUrl, {
        responseType: 'stream',
        headers: {
          Referer: vehicleUrl,
        },
      });

      if (current.status >= 400) {
        current.data?.destroy?.();
        throw new Error(`HTTP ${current.status}`);
      }

      return current;
    },
    {
      retries: 2,
      delayMs: 1_000,
    },
  );

  const tempPath = `${outputPath}.part`;

  try {
    await pipeline(response.data, fs.createWriteStream(tempPath));

    const stats = await fs.stat(tempPath);
    if (stats.size <= 0) {
      throw new Error('arquivo vazio');
    }

    await fs.move(tempPath, outputPath, { overwrite: true });

    return {
      bytes: stats.size,
      extension: inferExtension(imageUrl, response.headers),
    };
  } catch (error) {
    await fs.remove(tempPath).catch(() => {});
    throw error;
  }
}

export async function downloadVehicleImages({
  client,
  existingMetadata,
  imageUrls,
  logger,
  vehicleDir,
  vehicleUrl,
}) {
  await fs.ensureDir(vehicleDir);

  const savedFiles = [];
  const failures = [];
  let downloadedCount = 0;
  let reusedCount = 0;

  for (let index = 0; index < imageUrls.length; index += 1) {
    const imageUrl = imageUrls[index];
    const reusableFile = getReusableFile(existingMetadata, imageUrl, index);

    if (reusableFile && (await hasNonEmptyFile(path.join(vehicleDir, reusableFile)))) {
      savedFiles.push(reusableFile);
      reusedCount += 1;
      logger.info(`Imagem reaproveitada ${reusableFile} <- ${imageUrl}`);
      continue;
    }

    const sequence = String(index + 1).padStart(Math.max(2, String(imageUrls.length).length), '0');
    const guessedExtension = inferExtension(imageUrl);
    const guessedPath = path.join(vehicleDir, `${sequence}${guessedExtension}`);

    try {
      const result = await downloadSingleImage({
        client,
        imageUrl,
        outputPath: guessedPath,
        vehicleUrl,
      });

      const finalName = `${sequence}${result.extension}`;
      const finalPath = path.join(vehicleDir, finalName);

      if (finalPath !== guessedPath) {
        await fs.move(guessedPath, finalPath, { overwrite: true });
      }

      savedFiles.push(finalName);
      downloadedCount += 1;
      logger.info(`Imagem salva ${finalName} <- ${imageUrl}`);
    } catch (error) {
      failures.push({
        imageUrl,
        message: error.message,
      });
      logger.warn(`Falha ao baixar imagem ${imageUrl}: ${error.message}`);
    }
  }

  return {
    downloadedCount,
    failures,
    failedCount: failures.length,
    reusedCount,
    savedFiles,
  };
}

export async function saveVehicleMetadata(vehicleDir, metadata) {
  await fs.ensureDir(vehicleDir);
  await fs.writeJson(path.join(vehicleDir, 'metadata.json'), metadata, { spaces: 2 });
}

export async function saveSummary(outputDir, summary) {
  await fs.ensureDir(outputDir);
  await fs.writeJson(path.join(outputDir, '_resumo.json'), summary, { spaces: 2 });
}

