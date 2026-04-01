import path from 'node:path';

import sanitize from 'sanitize-filename';

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const DEFAULT_VIEWPORT = { width: 1440, height: 2200 };

export function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetries(task, options = {}) {
  const { retries = 2, delayMs = 1_000, onRetry = null } = options;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await task(attempt);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      if (typeof onRetry === 'function') {
        await onRetry(error, attempt);
      }

      await sleep(delayMs * (attempt + 1));
      attempt += 1;
    }
  }
}

export function normalizeUrl(rawUrl, baseUrl) {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl, baseUrl);
    url.hash = '';

    if (!url.pathname.endsWith('/')) {
      url.pathname = `${url.pathname}/`.replace(/\/{2,}/g, '/');
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeAssetUrl(rawUrl, baseUrl) {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl, baseUrl);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

export function slugFromVehicleUrl(vehicleUrl) {
  try {
    const url = new URL(vehicleUrl);
    return url.pathname.split('/').filter(Boolean).at(-1) || 'veiculo';
  } catch {
    return 'veiculo';
  }
}

export function sanitizeSegment(value, fallback = 'item') {
  const sanitized = sanitize(String(value || '').trim())
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();

  return sanitized || fallback;
}

export function buildVehicleFolderName(name, vehicleUrl) {
  const slug = sanitizeSegment(slugFromVehicleUrl(vehicleUrl), 'veiculo');
  const title = sanitizeSegment(name, slug);
  return `${title}__${slug}`;
}

export function padSequence(index, total) {
  const digits = Math.max(2, String(total).length);
  return String(index).padStart(digits, '0');
}

export function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getListingPageNumber(pageUrl) {
  try {
    const url = new URL(pageUrl);
    const match = url.pathname.match(/\/page\/(\d+)\/?$/i);
    return match ? Number.parseInt(match[1], 10) : 1;
  } catch {
    return 1;
  }
}

export function isVehicleDetailUrl(candidateUrl) {
  try {
    const url = new URL(candidateUrl);
    const { pathname } = url;

    if (!pathname.startsWith('/veiculos/')) {
      return false;
    }

    if (pathname === '/veiculos/' || pathname === '/veiculos') {
      return false;
    }

    if (/\/veiculos\/page\/\d+\/?$/i.test(pathname)) {
      return false;
    }

    return /^\/veiculos\/[^/]+\/?$/i.test(pathname);
  } catch {
    return false;
  }
}

export function isListingPageUrl(candidateUrl) {
  try {
    const url = new URL(candidateUrl);
    return (
      url.pathname === '/veiculos/' ||
      url.pathname === '/veiculos' ||
      /\/veiculos\/page\/\d+\/?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function extractPriceFromText(values) {
  for (const value of values) {
    const normalized = cleanText(value);

    if (/^R\$\s*[\d.]+(?:,\d{2})?,?$/i.test(normalized) || /R\$\s*[\d.]+,\d{2}/i.test(normalized)) {
      return normalized;
    }
  }

  return null;
}

export function scoreImageCandidate(candidate) {
  let score = 0;

  if (candidate.isPrimarySource) {
    score += 1_000_000;
  }

  if (!/-\d+x\d+(?=\.[a-z0-9]+$)/i.test(candidate.pathname)) {
    score += 100_000;
  }

  if (candidate.width && candidate.height) {
    score += candidate.width * candidate.height;
  }

  const match = candidate.pathname.match(/-(\d+)x(\d+)(?=\.[a-z0-9]+$)/i);
  if (match) {
    score += Number.parseInt(match[1], 10) * Number.parseInt(match[2], 10);
  }

  return score;
}

export function getCanonicalImageKey(imageUrl) {
  const url = new URL(imageUrl);
  return `${url.origin}${url.pathname.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '')}`;
}

export async function autoScroll(page, options = {}) {
  const { maxSteps = 24, step = 1_200, pauseMs = 200 } = options;

  await page.evaluate(
    async ({ maxSteps: innerMaxSteps, step: innerStep, pauseMs: innerPauseMs }) => {
      let previousOffset = -1;
      let attemptsWithoutProgress = 0;

      for (let index = 0; index < innerMaxSteps; index += 1) {
        window.scrollBy(0, innerStep);
        await new Promise((resolve) => setTimeout(resolve, innerPauseMs));

        if (window.scrollY === previousOffset) {
          attemptsWithoutProgress += 1;
          if (attemptsWithoutProgress >= 3) {
            break;
          }
        } else {
          attemptsWithoutProgress = 0;
          previousOffset = window.scrollY;
        }
      }

      window.scrollTo(0, 0);
    },
    { maxSteps, step, pauseMs },
  );
}

export function relativeOutputPath(baseDir, targetPath) {
  return path.relative(baseDir, targetPath) || '.';
}

