import express from 'express';

import { createCarRoutes } from '../routes/carRoutes.js';
import { createHealthRoutes } from '../routes/healthRoutes.js';
import { createRefreshRoutes } from '../routes/refreshRoutes.js';

export function createApp(appConfig) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/downloads', express.static(appConfig.downloadsDir));

  app.use('/api/health', createHealthRoutes());
  app.use('/api/cars', createCarRoutes(appConfig));
  app.use('/api/refresh', createRefreshRoutes(appConfig));

  app.use((_request, response) => {
    response.status(404).json({
      message: 'Rota nao encontrada.',
    });
  });

  app.use((error, _request, response, _next) => {
    appConfig.logger.error(error.stack || error.message);

    response.status(error.statusCode || 500).json({
      message: error.message || 'Erro interno do servidor.',
    });
  });

  return app;
}
