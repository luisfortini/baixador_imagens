import path from 'node:path';

import { runScraper } from './src/scraper.js';
import {
  DEFAULT_USER_AGENT,
  DEFAULT_VIEWPORT,
  createLogger,
  parsePositiveInteger,
} from './src/utils.js';

const logger = createLogger();

function buildConfig() {
  return {
    baseUrl: process.env.BASE_URL || 'https://svintermed.com.br/',
    archiveUrl: process.env.ARCHIVE_URL || 'https://svintermed.com.br/veiculos/',
    outputDir: path.resolve(process.cwd(), process.env.OUTPUT_DIR || 'downloads'),
    userAgent: process.env.USER_AGENT || DEFAULT_USER_AGENT,
    viewport: DEFAULT_VIEWPORT,
    headless: process.env.HEADLESS !== 'false',
    concurrency: parsePositiveInteger(process.env.CONCURRENCY) ?? 3,
    timeoutMs: parsePositiveInteger(process.env.TIMEOUT_MS) ?? 45_000,
    renderWaitMs: parsePositiveInteger(process.env.RENDER_WAIT_MS) ?? 1_500,
    maxPages: parsePositiveInteger(process.env.MAX_PAGES) ?? null,
    maxVehicles: parsePositiveInteger(process.env.MAX_VEHICLES) ?? null,
    logger,
  };
}

async function main() {
  const config = buildConfig();

  logger.info(`Arquivo de saida: ${config.outputDir}`);
  logger.info(`Concorrencia: ${config.concurrency}`);

  const summary = await runScraper(config);

  logger.info(
    `Fim do lote. ${summary.totals.succeeded}/${summary.totals.processed} veiculos processados com sucesso.`,
  );
  logger.info(`Resumo consolidado salvo em ${path.join(config.outputDir, '_resumo.json')}`);
}

main().catch((error) => {
  logger.error(`Falha geral: ${error.message}`);
  process.exitCode = 1;
});
