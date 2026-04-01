import path from 'node:path';

import fs from 'fs-extra';

import { normalizeCarFolder } from './carNormalizer.js';
import {
  INVENTORY_FILE_NAME,
  getLatestDirectoryContentMtime,
  listCarFolders,
  readJsonIfExists,
  writeJsonPretty,
} from '../utils/filesystem.js';
import { naturalCompare } from '../utils/sort.js';

function normalizeInventoryPayload(inventory) {
  if (!inventory) {
    return null;
  }

  if (Array.isArray(inventory)) {
    return {
      cars: inventory,
      generatedAt: null,
      skippedFolders: [],
      totalCars: inventory.length,
    };
  }

  if (!Array.isArray(inventory.cars)) {
    return null;
  }

  return {
    cars: inventory.cars,
    generatedAt: inventory.generatedAt || null,
    skippedFolders: Array.isArray(inventory.skippedFolders) ? inventory.skippedFolders : [],
    totalCars: inventory.totalCars ?? inventory.cars.length,
  };
}

function buildInventoryIndex(cars = []) {
  return new Map(cars.map((car) => [car.id, car]));
}

async function readInventoryFile(inventoryPath) {
  const inventory = await readJsonIfExists(inventoryPath);
  return normalizeInventoryPayload(inventory);
}

async function inventoryNeedsRebuild({ downloadsDir, inventory, inventoryPath }) {
  if (!inventory) {
    return true;
  }

  const inventoryStats = await fs.stat(inventoryPath).catch(() => null);
  if (!inventoryStats) {
    return true;
  }

  const folders = await listCarFolders(downloadsDir);
  const knownFolders = new Set([
    ...inventory.cars.map((car) => car.folderName).filter(Boolean),
    ...inventory.skippedFolders,
  ]);

  if (folders.length !== knownFolders.size) {
    return true;
  }

  for (const folderName of folders) {
    if (!knownFolders.has(folderName)) {
      return true;
    }

    const folderPath = path.join(downloadsDir, folderName);
    const latestContentMtimeMs = await getLatestDirectoryContentMtime(folderPath);

    if (latestContentMtimeMs > inventoryStats.mtimeMs) {
      return true;
    }
  }

  return false;
}

function sortCars(cars) {
  return [...cars].sort((left, right) => {
    const byName = naturalCompare(left.name || left.folderName, right.name || right.folderName);
    if (byName !== 0) {
      return byName;
    }

    return naturalCompare(left.folderName, right.folderName);
  });
}

export async function buildInventory({ downloadsDir, inventoryPath, logger }) {
  const existingInventory = await readInventoryFile(inventoryPath);
  const existingInventoryById = buildInventoryIndex(existingInventory?.cars);
  const folderNames = await listCarFolders(downloadsDir);
  const cars = [];
  const skippedFolders = [];

  for (const folderName of folderNames) {
    const car = await normalizeCarFolder({
      downloadsDir,
      existingInventoryById,
      folderName,
    });

    if (!car) {
      skippedFolders.push(folderName);
      continue;
    }

    cars.push(car);
  }

  const inventory = {
    generatedAt: new Date().toISOString(),
    totalCars: cars.length,
    skippedFolders,
    cars: sortCars(cars),
  };

  await writeJsonPretty(inventoryPath, inventory);
  logger?.info?.(`Inventory consolidado salvo em ${inventoryPath} com ${inventory.totalCars} carros.`);

  return inventory;
}

export async function ensureInventory({
  downloadsDir,
  forceRegenerate = false,
  inventoryPath = path.join(downloadsDir, INVENTORY_FILE_NAME),
  logger,
}) {
  const inventory = await readInventoryFile(inventoryPath);

  if (forceRegenerate || (await inventoryNeedsRebuild({ downloadsDir, inventory, inventoryPath }))) {
    return buildInventory({ downloadsDir, inventoryPath, logger });
  }

  return inventory;
}

export async function listCars(options) {
  const inventory = await ensureInventory(options);
  return inventory.cars;
}

export async function findCarById(id, options) {
  const cars = await listCars(options);
  return cars.find((car) => car.id === id) || null;
}
