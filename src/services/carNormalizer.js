import path from 'node:path';

import fs from 'fs-extra';

import {
  METADATA_FILE_NAME,
  listImageFiles,
  readJsonIfExists,
  toPublicDownloadsPath,
} from '../utils/filesystem.js';
import { createStableCarId } from '../utils/slug.js';

export async function normalizeCarFolder({
  downloadsDir,
  existingInventoryById = new Map(),
  folderName,
}) {
  const folderPath = path.join(downloadsDir, folderName);
  const metadataPath = path.join(folderPath, METADATA_FILE_NAME);
  const metadata = await readJsonIfExists(metadataPath);

  if (!metadata) {
    return null;
  }

  const imageFiles = await listImageFiles(folderPath);
  const images = imageFiles.map((fileName) => toPublicDownloadsPath(folderName, fileName));
  const id = createStableCarId({
    folderName: metadata.folderName || folderName,
    name: metadata.name,
    url: metadata.url,
  });
  const existing = existingInventoryById.get(id);
  const metadataStats = await fs.stat(metadataPath).catch(() => null);

  return {
    id,
    folderName: metadata.folderName || folderName,
    name: metadata.name || folderName,
    description: metadata.description || null,
    pageTitle: metadata.pageTitle || null,
    price: metadata.price || null,
    url: metadata.url || null,
    images,
    coverImage: images[0] || null,
    totalImages: images.length,
    status: existing?.status || 'active',
    updatedAt: metadata.collectedAt || metadataStats?.mtime?.toISOString() || new Date().toISOString(),
    collectedAt: metadata.collectedAt || null,
    extractionMode: metadata.extractionMode || null,
    savedFiles: Array.isArray(metadata.savedFiles) ? metadata.savedFiles : imageFiles,
    sourceImageUrls: Array.isArray(metadata.sourceImageUrls) ? metadata.sourceImageUrls : [],
    warnings: Array.isArray(metadata.warnings) ? metadata.warnings : [],
    errors: Array.isArray(metadata.errors) ? metadata.errors : [],
  };
}
