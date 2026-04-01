import { slugFromVehicleUrl } from './scraperUtils.js';

function normalizeStableId(value, fallback = 'veiculo') {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

export function extractIdFromFolderName(folderName) {
  const value = String(folderName || '');
  const separatorIndex = value.lastIndexOf('__');

  if (separatorIndex < 0) {
    return null;
  }

  return normalizeStableId(value.slice(separatorIndex + 2));
}

export function createStableCarId({ folderName, url, name }) {
  return (
    extractIdFromFolderName(folderName) ||
    normalizeStableId(slugFromVehicleUrl(url)) ||
    normalizeStableId(name)
  );
}
