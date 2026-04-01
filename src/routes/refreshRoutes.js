import express from 'express';

import { refreshCars } from '../services/refreshService.js';
import { parsePositiveInteger } from '../utils/scraperUtils.js';

function buildRefreshOptions(body = {}) {
  return {
    headless: typeof body.headless === 'boolean' ? body.headless : undefined,
    maxPages: parsePositiveInteger(body.maxPages),
    maxVehicles: parsePositiveInteger(body.maxVehicles),
  };
}

export function createRefreshRoutes(appConfig) {
  const router = express.Router();

  router.post('/', async (request, response, next) => {
    try {
      const result = await refreshCars(appConfig, buildRefreshOptions(request.body));
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
