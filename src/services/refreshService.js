import { createScraperConfig } from '../config/appConfig.js';
import { runScraper } from '../scraper/runScraper.js';
import { buildInventory } from './carInventoryService.js';

let activeRefreshPromise = null;

function pickDefinedValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null),
  );
}

async function executeRefresh(appConfig, options = {}) {
  const scraperSummary = await runScraper(
    createScraperConfig(
      appConfig,
      pickDefinedValues({
        headless: options.headless,
        maxPages: options.maxPages,
        maxVehicles: options.maxVehicles,
      }),
    ),
  );

  const inventory = await buildInventory({
    downloadsDir: appConfig.downloadsDir,
    inventoryPath: appConfig.inventoryPath,
    logger: appConfig.logger,
  });

  return {
    alreadyRunning: false,
    inventory: {
      filePath: appConfig.inventoryPath,
      generatedAt: inventory.generatedAt,
      totalCars: inventory.totalCars,
    },
    refreshedAt: new Date().toISOString(),
    scraperSummary,
  };
}

export async function refreshCars(appConfig, options = {}) {
  if (activeRefreshPromise) {
    const result = await activeRefreshPromise;
    return {
      ...result,
      alreadyRunning: true,
    };
  }

  activeRefreshPromise = executeRefresh(appConfig, options).finally(() => {
    activeRefreshPromise = null;
  });

  return activeRefreshPromise;
}
