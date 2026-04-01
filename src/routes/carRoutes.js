import express from 'express';

import { ensureInventory, findCarById } from '../services/carInventoryService.js';

export function createCarRoutes(appConfig) {
  const router = express.Router();

  router.get('/', async (request, response, next) => {
    try {
      const inventory = await ensureInventory({
        downloadsDir: appConfig.downloadsDir,
        forceRegenerate: request.query.regenerate === 'true',
        inventoryPath: appConfig.inventoryPath,
        logger: appConfig.logger,
      });

      response.json(inventory.cars);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    try {
      const car = await findCarById(request.params.id, {
        downloadsDir: appConfig.downloadsDir,
        inventoryPath: appConfig.inventoryPath,
        logger: appConfig.logger,
      });

      if (!car) {
        response.status(404).json({
          id: request.params.id,
          message: 'Carro nao encontrado.',
        });
        return;
      }

      response.json(car);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
