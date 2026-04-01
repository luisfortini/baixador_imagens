import path from 'node:path';

import fs from 'fs-extra';

import { naturalCompare } from './sort.js';

export const INVENTORY_FILE_NAME = 'inventory.json';
export const METADATA_FILE_NAME = 'metadata.json';
export const SUMMARY_FILE_NAME = '_resumo.json';

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png']);

export function isSupportedImageFile(fileName) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export async function readJsonIfExists(filePath) {
  try {
    if (!(await fs.pathExists(filePath))) {
      return null;
    }

    return await fs.readJson(filePath);
  } catch {
    return null;
  }
}

export async function writeJsonPretty(filePath, data) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, data, { spaces: 2 });
}

export async function listCarFolders(downloadsDir) {
  if (!(await fs.pathExists(downloadsDir))) {
    return [];
  }

  const entries = await fs.readdir(downloadsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(naturalCompare);
}

export async function listImageFiles(folderPath) {
  if (!(await fs.pathExists(folderPath))) {
    return [];
  }

  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && isSupportedImageFile(entry.name))
    .map((entry) => entry.name)
    .sort(naturalCompare);
}

export function toPublicDownloadsPath(...segments) {
  const normalizedSegments = segments.map((segment) => String(segment || '').replace(/\\/g, '/'));
  return path.posix.join('/downloads', ...normalizedSegments);
}

export async function getLatestDirectoryContentMtime(directoryPath) {
  if (!(await fs.pathExists(directoryPath))) {
    return 0;
  }

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  let latestMtimeMs = 0;

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    const stats = await fs.stat(fullPath).catch(() => null);

    if (stats?.mtimeMs && stats.mtimeMs > latestMtimeMs) {
      latestMtimeMs = stats.mtimeMs;
    }
  }

  return latestMtimeMs;
}
