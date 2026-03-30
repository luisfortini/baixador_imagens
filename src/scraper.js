import path from 'node:path';

import fs from 'fs-extra';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

import {
  autoScroll,
  buildVehicleFolderName,
  cleanText,
  extractPriceFromText,
  getCanonicalImageKey,
  getListingPageNumber,
  isListingPageUrl,
  isVehicleDetailUrl,
  normalizeAssetUrl,
  normalizeUrl,
  relativeOutputPath,
  scoreImageCandidate,
  slugFromVehicleUrl,
  uniqueStrings,
  withRetries,
} from './utils.js';
import {
  canReuseExistingVehicle,
  createHttpClient,
  downloadVehicleImages,
  fetchHtml,
  loadVehicleMetadata,
  saveSummary,
  saveVehicleMetadata,
} from './downloader.js';

function buildContextOptions(config) {
  return {
    extraHTTPHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    ignoreHTTPSErrors: true,
    userAgent: config.userAgent,
    viewport: config.viewport,
  };
}

async function launchBrowser(config) {
  try {
    return await chromium.launch({ headless: config.headless });
  } catch (error) {
    throw new Error(
      `Nao foi possivel iniciar o Playwright (${error.message}). Execute "npx playwright install chromium" antes do primeiro uso.`,
    );
  }
}

async function renderPage(page, url, config, logger, label) {
  return withRetries(
    async () => {
      await page.goto(url, {
        timeout: config.timeoutMs,
        waitUntil: 'domcontentloaded',
      });

      await page.waitForLoadState('networkidle', {
        timeout: Math.min(config.timeoutMs, 15_000),
      }).catch(() => {});

      await page.waitForTimeout(config.renderWaitMs);
      return page.content();
    },
    {
      retries: 2,
      delayMs: 1_250,
      onRetry: async (error, attempt) => {
        logger.warn(`${label}: nova tentativa ${attempt + 2} para ${url} (${error.message})`);
      },
    },
  );
}

async function renderPageWithFallback(page, url, config, httpClient, logger, label) {
  try {
    return await renderPage(page, url, config, logger, label);
  } catch (error) {
    logger.warn(`${label}: Playwright falhou para ${url}. Usando fallback HTTP. Motivo: ${error.message}`);
    return fetchHtml(httpClient, url, logger);
  }
}

function parseListingPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const vehicleLinks = [];
  const currentPage = getListingPageNumber(pageUrl);
  let nextPageUrl = null;

  $('a[href]').each((_, element) => {
    const href = normalizeUrl($(element).attr('href'), pageUrl);
    if (!href) {
      return;
    }

    if (isVehicleDetailUrl(href)) {
      vehicleLinks.push(href);
      return;
    }

    if (!isListingPageUrl(href) || href === pageUrl) {
      return;
    }

    const text = cleanText($(element).text());
    const className = cleanText($(element).attr('class'));
    const pageNumber = getListingPageNumber(href);
    const looksLikeNext =
      /proximo|pr[óo]ximo|next/i.test(text) ||
      /\bnext\b/i.test(className) ||
      pageNumber === currentPage + 1;

    if (looksLikeNext && !nextPageUrl) {
      nextPageUrl = href;
    }
  });

  return {
    nextPageUrl,
    vehicleLinks: uniqueStrings(vehicleLinks),
  };
}

async function discoverVehicleLinks(page, config, httpClient, logger) {
  const discoveredLinks = new Set();
  const visitedPages = new Set();
  const pageSummaries = [];
  let currentUrl = normalizeUrl(config.archiveUrl, config.baseUrl);
  let iteration = 0;

  while (currentUrl && !visitedPages.has(currentUrl)) {
    if (config.maxPages && iteration >= config.maxPages) {
      logger.warn(`Limite de paginas atingido em ${config.maxPages}.`);
      break;
    }

    iteration += 1;
    visitedPages.add(currentUrl);
    logger.info(`[LISTAGEM ${iteration}] Abrindo ${currentUrl}`);

    const html = await renderPageWithFallback(page, currentUrl, config, httpClient, logger, 'Listagem');
    const parsed = parseListingPage(html, currentUrl);

    for (const vehicleLink of parsed.vehicleLinks) {
      discoveredLinks.add(vehicleLink);
    }

    pageSummaries.push({
      page: currentUrl,
      discoveredInPage: parsed.vehicleLinks.length,
      totalDiscovered: discoveredLinks.size,
    });

    logger.info(
      `[LISTAGEM ${iteration}] ${parsed.vehicleLinks.length} links nesta pagina, ${discoveredLinks.size} acumulados.`,
    );

    currentUrl = parsed.nextPageUrl && !visitedPages.has(parsed.nextPageUrl) ? parsed.nextPageUrl : null;
  }

  return {
    discoveredCount: discoveredLinks.size,
    pageSummaries,
    vehicleLinks: Array.from(discoveredLinks),
  };
}

function collectImageCandidate(candidate, imageCandidates, pageUrl) {
  const normalized = normalizeAssetUrl(candidate.url, pageUrl);
  if (!normalized) {
    return;
  }

  try {
    const url = new URL(normalized);
    const pathname = url.pathname.toLowerCase();

    if (!pathname.includes('/wp-content/uploads/')) {
      return;
    }

    if (!/\.(avif|gif|jpe?g|png|webp)$/i.test(pathname)) {
      return;
    }

    imageCandidates.push({
      ...candidate,
      pathname,
      url: normalized,
    });
  } catch {
    return;
  }
}

function isIgnoredPageImage(candidate) {
  const pathname = candidate.pathname.toLowerCase();
  const chain = String(candidate.chain || '').toLowerCase();

  if (/logo|avatar|icone|icon|favicon|cropped-|foto-avatar|fotos-breve-proweb/.test(pathname)) {
    return true;
  }

  if (/topo|contatos|header|footer/.test(chain)) {
    return true;
  }

  if (candidate.width && candidate.width < 250) {
    return true;
  }

  if (candidate.height && candidate.height < 250) {
    return true;
  }

  return false;
}

function dedupeImageCandidates(candidates) {
  const grouped = new Map();

  for (const candidate of candidates) {
    const key = getCanonicalImageKey(candidate.url);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, { ...candidate });
      continue;
    }

    const currentScore = scoreImageCandidate(current);
    const nextScore = scoreImageCandidate(candidate);

    if (nextScore > currentScore) {
      grouped.set(key, {
        ...candidate,
        order: Math.min(candidate.order, current.order),
        top: Math.min(candidate.top ?? Number.POSITIVE_INFINITY, current.top ?? Number.POSITIVE_INFINITY),
      });
    } else {
      current.order = Math.min(current.order, candidate.order);
      current.top = Math.min(current.top ?? Number.POSITIVE_INFINITY, candidate.top ?? Number.POSITIVE_INFINITY);
    }
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const leftTop = left.top ?? Number.POSITIVE_INFINITY;
    const rightTop = right.top ?? Number.POSITIVE_INFINITY;

    if (leftTop !== rightTop) {
      return leftTop - rightTop;
    }

    return left.order - right.order;
  });
}

async function collectVehicleSnapshot(page, pageUrl) {
  const domSnapshot = await page.evaluate(() => {
    const collectChain = (node) => {
      const chain = [];
      let current = node;
      let depth = 0;

      while (current && depth < 6) {
        const tag = current.tagName ? current.tagName.toLowerCase() : 'node';
        const id = current.id ? `#${current.id}` : '';
        const className =
          current.className && typeof current.className === 'string'
            ? `.${current.className.trim().replace(/\s+/g, '.')}`
            : '';

        chain.push(`${tag}${id}${className}`);
        current = current.parentElement;
        depth += 1;
      }

      return chain.join(' <- ');
    };

    const h1 = document.querySelector('h1');
    const h1Top = h1 ? Math.round(h1.getBoundingClientRect().top + window.scrollY) : null;

    const images = Array.from(document.querySelectorAll('img')).flatMap((image, index) => {
      const rect = image.getBoundingClientRect();
      const top = Math.round(rect.top + window.scrollY);
      const values = [image.currentSrc, image.src, image.dataset?.src, image.dataset?.lazySrc].filter(Boolean);

      return values.map((value, offset) => ({
        alt: image.alt || '',
        chain: collectChain(image),
        height: image.naturalHeight || Math.round(rect.height),
        order: index * 10 + offset + 1,
        source: 'dom',
        top,
        url: value,
        width: image.naturalWidth || Math.round(rect.width),
      }));
    });

    return {
      h1Top,
      h1Text: h1?.textContent?.trim() || '',
      images,
      title: document.title,
    };
  });

  const html = await page.content();
  const $ = cheerio.load(html);

  return {
    $,
    domSnapshot,
  };
}

function extractVehicleMetadata($, domSnapshot, vehicleUrl) {
  const name =
    cleanText(domSnapshot.h1Text) ||
    cleanText($('h1').first().text()) ||
    slugFromVehicleUrl(vehicleUrl);
  const pageTitle = cleanText(domSnapshot.title) || cleanText($('title').text()) || name;
  const description = cleanText($('meta[name="description"]').attr('content'));
  const prices = $('h1, h2, h3, p, span, strong')
    .map((_, element) => cleanText($(element).text()))
    .get();

  return {
    canonicalUrl: normalizeUrl($('link[rel="canonical"]').attr('href'), vehicleUrl) || vehicleUrl,
    description,
    name,
    pageTitle,
    price: extractPriceFromText(prices),
    slug: slugFromVehicleUrl(vehicleUrl),
  };
}

function selectMainGallery(snapshot, vehicleUrl) {
  const candidates = [];

  for (const candidate of snapshot.domSnapshot.images) {
    collectImageCandidate(candidate, candidates, vehicleUrl);
  }

  const usableCandidates = dedupeImageCandidates(candidates).filter((candidate) => !isIgnoredPageImage(candidate));
  if (!usableCandidates.length) {
    return {
      ignoredRelatedCount: 0,
      imageUrls: [],
    };
  }

  const h1Top = snapshot.domSnapshot.h1Top;
  const earliestTop = usableCandidates.reduce(
    (currentMin, candidate) => Math.min(currentMin, candidate.top ?? Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY,
  );

  const cutoff = Number.isFinite(h1Top) ? h1Top + 250 : earliestTop + 250;
  const mainCandidates = usableCandidates.filter((candidate) => (candidate.top ?? Number.POSITIVE_INFINITY) <= cutoff);
  const laterCandidates = usableCandidates.filter((candidate) => (candidate.top ?? Number.POSITIVE_INFINITY) > cutoff);

  if (Number.isFinite(h1Top) && earliestTop > cutoff) {
    return {
      ignoredRelatedCount: laterCandidates.length || usableCandidates.length,
      imageUrls: [],
    };
  }

  return {
    ignoredRelatedCount: laterCandidates.length,
    imageUrls: mainCandidates.map((candidate) => candidate.url),
  };
}

async function extractVehicleFromPage(page, vehicleUrl, config, logger) {
  await renderPage(page, vehicleUrl, config, logger, 'Veiculo');
  await page.waitForSelector('h1', { timeout: Math.min(config.timeoutMs, 12_000) }).catch(() => {});

  let bestResult = null;
  let previousCount = -1;
  let stablePasses = 0;

  for (let pass = 0; pass < 3; pass += 1) {
    await autoScroll(page, { maxSteps: 28, pauseMs: 250, step: 1_000 });
    await page.waitForTimeout(config.renderWaitMs + pass * 500);

    const snapshot = await collectVehicleSnapshot(page, vehicleUrl);
    const metadata = extractVehicleMetadata(snapshot.$, snapshot.domSnapshot, vehicleUrl);
    const selection = selectMainGallery(snapshot, vehicleUrl);

    if (!bestResult || selection.imageUrls.length > bestResult.imageUrls.length) {
      bestResult = {
        ignoredRelatedCount: selection.ignoredRelatedCount,
        imageUrls: selection.imageUrls,
        metadata,
      };
    }

    if (selection.imageUrls.length <= previousCount) {
      stablePasses += 1;
      if (stablePasses >= 1) {
        break;
      }
    } else {
      previousCount = selection.imageUrls.length;
      stablePasses = 0;
    }
  }

  if (!bestResult) {
    throw new Error('Nao foi possivel extrair os dados renderizados do veiculo.');
  }

  const warnings = [];
  if (!bestResult.imageUrls.length && bestResult.ignoredRelatedCount > 0) {
    warnings.push('Galeria principal ausente; imagens de veiculos relacionados foram ignoradas.');
  } else if (bestResult.ignoredRelatedCount > 0) {
    warnings.push('Imagens fora da galeria principal foram ignoradas.');
  }

  return {
    extractionMode: 'playwright',
    imageUrls: bestResult.imageUrls,
    metadata: bestResult.metadata,
    warnings,
  };
}

async function extractVehicleViaHttpFallback(vehicleUrl, httpClient, logger, originalError) {
  const html = await fetchHtml(httpClient, vehicleUrl, logger);
  const $ = cheerio.load(html);
  const domSnapshot = {
    h1Text: $('h1').first().text(),
    title: $('title').text(),
  };
  const metadata = extractVehicleMetadata($, domSnapshot, vehicleUrl);

  return {
    extractionMode: 'http-fallback',
    imageUrls: [],
    metadata,
    warnings: [`Playwright falhou e nenhuma imagem foi baixada para evitar misturar relacionados: ${originalError.message}`],
  };
}

async function processVehicle({
  index,
  outputDir,
  page,
  total,
  url,
  config,
  httpClient,
  logger,
}) {
  const prefix = `[VEICULO ${index + 1}/${total}]`;
  logger.info(`${prefix} Iniciando ${url}`);

  let extracted;

  try {
    extracted = await extractVehicleFromPage(page, url, config, logger);
  } catch (error) {
    logger.warn(`${prefix} Falha no fluxo principal (${error.message}). Tentando fallback HTTP.`);
    extracted = await extractVehicleViaHttpFallback(url, httpClient, logger, error);
  }

  const vehicleDir = path.join(outputDir, buildVehicleFolderName(extracted.metadata.name, url));
  const metadataPath = path.join(vehicleDir, 'metadata.json');
  const existingMetadata = await loadVehicleMetadata(vehicleDir);

  await fs.ensureDir(vehicleDir);

  let downloadSummary;
  const warnings = [...extracted.warnings];

  if (await canReuseExistingVehicle(vehicleDir, existingMetadata, extracted.imageUrls)) {
    downloadSummary = {
      downloadedCount: 0,
      failures: [],
      failedCount: 0,
      reusedCount: extracted.imageUrls.length,
      savedFiles: existingMetadata.savedFiles,
    };
    warnings.push('Imagens reaproveitadas integralmente a partir de uma coleta anterior.');
  } else {
    downloadSummary = await downloadVehicleImages({
      client: httpClient,
      existingMetadata,
      imageUrls: extracted.imageUrls,
      logger,
      vehicleDir,
      vehicleUrl: url,
    });
  }

  const vehicleMetadata = {
    collectedAt: new Date().toISOString(),
    description: extracted.metadata.description || null,
    extractionMode: extracted.extractionMode,
    folderName: path.basename(vehicleDir),
    name: extracted.metadata.name,
    pageTitle: extracted.metadata.pageTitle,
    price: extracted.metadata.price,
    savedFiles: downloadSummary.savedFiles,
    sourceImageUrls: extracted.imageUrls,
    totalImages: extracted.imageUrls.length,
    url: extracted.metadata.canonicalUrl,
    warnings,
    errors: downloadSummary.failures,
  };

  await saveVehicleMetadata(vehicleDir, vehicleMetadata);

  let status = 'success';
  if (!extracted.imageUrls.length && warnings.length) {
    status = 'partial';
  }

  if (downloadSummary.failedCount && !downloadSummary.savedFiles.length) {
    status = 'failed';
  } else if (downloadSummary.failedCount) {
    status = 'partial';
  }

  logger.info(
    `${prefix} Finalizado com status ${status}. ${downloadSummary.savedFiles.length}/${extracted.imageUrls.length} imagens disponiveis.`,
  );

  return {
    download: {
      downloadedCount: downloadSummary.downloadedCount,
      failedCount: downloadSummary.failedCount,
      reusedCount: downloadSummary.reusedCount,
    },
    folder: path.basename(vehicleDir),
    metadataPath: relativeOutputPath(outputDir, metadataPath),
    name: extracted.metadata.name,
    status,
    totalImages: extracted.imageUrls.length,
    url: extracted.metadata.canonicalUrl,
    warnings,
  };
}

async function processVehicleBatch(context, vehicleLinks, config, httpClient, logger) {
  const results = new Array(vehicleLinks.length);
  const workerCount = Math.max(1, Math.min(config.concurrency, vehicleLinks.length));
  let cursor = 0;

  async function worker(workerId) {
    const page = await context.newPage();

    try {
      while (true) {
        const currentIndex = cursor;
        cursor += 1;

        if (currentIndex >= vehicleLinks.length) {
          break;
        }

        const vehicleUrl = vehicleLinks[currentIndex];

        try {
          results[currentIndex] = await processVehicle({
            config,
            httpClient,
            index: currentIndex,
            logger,
            outputDir: config.outputDir,
            page,
            total: vehicleLinks.length,
            url: vehicleUrl,
          });
        } catch (error) {
          logger.error(`[WORKER ${workerId}] Falha definitiva em ${vehicleUrl}: ${error.message}`);
          results[currentIndex] = {
            download: {
              downloadedCount: 0,
              failedCount: 0,
              reusedCount: 0,
            },
            folder: null,
            metadataPath: null,
            name: slugFromVehicleUrl(vehicleUrl),
            status: 'failed',
            totalImages: 0,
            url: vehicleUrl,
            warnings: [error.message],
          };
        }
      }
    } finally {
      await page.close();
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, index) => worker(index + 1)));
  return results;
}

function buildSummary({
  config,
  discoveredCount,
  listingPages,
  processedVehicles,
  startedAt,
}) {
  const totals = processedVehicles.reduce(
    (accumulator, vehicle) => {
      accumulator.processed += 1;
      accumulator.images += vehicle.totalImages;
      accumulator.downloaded += vehicle.download.downloadedCount;
      accumulator.reused += vehicle.download.reusedCount;
      accumulator.imageFailures += vehicle.download.failedCount;

      if (vehicle.status === 'success') {
        accumulator.succeeded += 1;
      } else if (vehicle.status === 'partial') {
        accumulator.partial += 1;
      } else {
        accumulator.failed += 1;
      }

      return accumulator;
    },
    {
      downloaded: 0,
      failed: 0,
      imageFailures: 0,
      images: 0,
      partial: 0,
      processed: 0,
      reused: 0,
      succeeded: 0,
    },
  );

  return {
    finishedAt: new Date().toISOString(),
    startedAt,
    source: {
      archiveUrl: config.archiveUrl,
      baseUrl: config.baseUrl,
    },
    totals: {
      ...totals,
      discovered: discoveredCount,
      listingPages: listingPages.length,
    },
    listingPages,
    vehicles: processedVehicles,
  };
}

export async function runScraper(config) {
  const startedAt = new Date().toISOString();
  const logger = config.logger;
  const httpClient = createHttpClient(config);

  await fs.ensureDir(config.outputDir);

  const browser = await launchBrowser(config);
  let discoveryContext;
  let discoveryPage;
  let processContext;

  try {
    discoveryContext = await browser.newContext(buildContextOptions(config));
    discoveryPage = await discoveryContext.newPage();

    const discovery = await discoverVehicleLinks(discoveryPage, config, httpClient, logger);
    let vehicleLinks = discovery.vehicleLinks;

    if (!vehicleLinks.length) {
      throw new Error('Nenhum veiculo foi encontrado na listagem.');
    }

    if (config.maxVehicles) {
      vehicleLinks = vehicleLinks.slice(0, config.maxVehicles);
      logger.warn(`Processamento limitado aos primeiros ${vehicleLinks.length} veiculos.`);
    }

    logger.info(`Total de veiculos unicos encontrados: ${discovery.discoveredCount}`);
    logger.info(`Total de veiculos a processar nesta execucao: ${vehicleLinks.length}`);

    await discoveryPage.close().catch(() => {});
    discoveryPage = null;
    await discoveryContext.close().catch(() => {});
    discoveryContext = null;

    processContext = await browser.newContext(buildContextOptions(config));

    const processedVehicles = await processVehicleBatch(
      processContext,
      vehicleLinks,
      config,
      httpClient,
      logger,
    );

    const summary = buildSummary({
      config,
      discoveredCount: discovery.discoveredCount,
      listingPages: discovery.pageSummaries,
      processedVehicles,
      startedAt,
    });

    await saveSummary(config.outputDir, summary);
    return summary;
  } finally {
    await discoveryPage?.close().catch(() => {});
    await discoveryContext?.close().catch(() => {});
    await processContext?.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
