import { createAppConfig } from './src/config/appConfig.js';
import { startServer } from './src/server/startServer.js';
import { buildInventory } from './src/services/carInventoryService.js';
import { refreshCars } from './src/services/refreshService.js';
import { createLogger } from './src/utils/logger.js';

async function main() {
  const logger = createLogger();
  const config = createAppConfig({ logger });

  if (process.argv.includes('--refresh')) {
    logger.info('Executando refresh completo de scraping e inventory.');

    const result = await refreshCars(config);
    logger.info(`Refresh finalizado. Inventory atualizado em ${config.inventoryPath}.`);
    logger.info(
      `Resumo do lote: ${result.scraperSummary.totals.succeeded}/${result.scraperSummary.totals.processed} veiculos com sucesso.`,
    );
    return;
  }

  if (process.argv.includes('--inventory-only')) {
    const inventory = await buildInventory({
      downloadsDir: config.downloadsDir,
      inventoryPath: config.inventoryPath,
      logger,
    });
    logger.info(`Inventory gerado com ${inventory.totalCars} carros em ${config.inventoryPath}.`);
    return;
  }

  await startServer(config);
}

main().catch((error) => {
  console.error(`[${new Date().toISOString()}] [ERROR]`, `Falha geral: ${error.message}`);
  process.exitCode = 1;
});
