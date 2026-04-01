import { runScraper as runScraperCore } from './scraperCore.js';

export async function runScraper(scraperConfig) {
  return runScraperCore(scraperConfig);
}
