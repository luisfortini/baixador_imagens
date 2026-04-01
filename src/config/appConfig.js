import path from 'node:path';

import { createLogger } from '../utils/logger.js';
import {
  DEFAULT_USER_AGENT,
  DEFAULT_VIEWPORT,
  parsePositiveInteger,
} from '../utils/scraperUtils.js';

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 3000;

export function createAppConfig(options = {}) {
  const logger = options.logger ?? createLogger();
  const projectRoot = path.resolve(process.cwd());
  const downloadsDir = path.resolve(projectRoot, options.outputDir || process.env.OUTPUT_DIR || 'downloads');

  return {
    downloadsDir,
    inventoryPath: path.join(downloadsDir, 'inventory.json'),
    logger,
    projectRoot,
    scraper: {
      archiveUrl: options.archiveUrl || process.env.ARCHIVE_URL || 'https://svintermed.com.br/veiculos/',
      baseUrl: options.baseUrl || process.env.BASE_URL || 'https://svintermed.com.br/',
      concurrency: parsePositiveInteger(options.concurrency ?? process.env.CONCURRENCY) ?? 3,
      headless: options.headless ?? process.env.HEADLESS !== 'false',
      maxPages: parsePositiveInteger(options.maxPages ?? process.env.MAX_PAGES) ?? null,
      maxVehicles: parsePositiveInteger(options.maxVehicles ?? process.env.MAX_VEHICLES) ?? null,
      outputDir: downloadsDir,
      renderWaitMs: parsePositiveInteger(options.renderWaitMs ?? process.env.RENDER_WAIT_MS) ?? 1_500,
      timeoutMs: parsePositiveInteger(options.timeoutMs ?? process.env.TIMEOUT_MS) ?? 45_000,
      userAgent: options.userAgent || process.env.USER_AGENT || DEFAULT_USER_AGENT,
      viewport: DEFAULT_VIEWPORT,
    },
    server: {
      host: options.host || process.env.HOST || DEFAULT_HOST,
      port: parsePositiveInteger(options.port ?? process.env.PORT) ?? DEFAULT_PORT,
    },
  };
}

export function createScraperConfig(appConfig, overrides = {}) {
  return {
    ...appConfig.scraper,
    ...overrides,
    logger: overrides.logger ?? appConfig.logger,
    outputDir: appConfig.downloadsDir,
    viewport: overrides.viewport || appConfig.scraper.viewport,
  };
}
