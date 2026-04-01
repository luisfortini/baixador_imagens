import { ensureInventory } from '../services/carInventoryService.js';
import { createApp } from './createApp.js';

export async function startServer(appConfig) {
  try {
    await ensureInventory({
      downloadsDir: appConfig.downloadsDir,
      inventoryPath: appConfig.inventoryPath,
      logger: appConfig.logger,
    });
  } catch (error) {
    appConfig.logger.warn(`Nao foi possivel gerar o inventory inicial: ${error.message}`);
  }

  const app = createApp(appConfig);

  return new Promise((resolve, reject) => {
    const server = app.listen(appConfig.server.port, appConfig.server.host, () => {
      appConfig.logger.info(
        `Backend local em http://${appConfig.server.host}:${appConfig.server.port}`,
      );
      appConfig.logger.info(
        `Arquivos estaticos em http://${appConfig.server.host}:${appConfig.server.port}/downloads/`,
      );

      resolve({
        app,
        config: appConfig,
        server,
      });
    });

    server.on('error', reject);
  });
}
