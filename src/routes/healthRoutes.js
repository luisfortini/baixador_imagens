import express from 'express';

export function createHealthRoutes() {
  const router = express.Router();

  router.get('/', (_request, response) => {
    response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
