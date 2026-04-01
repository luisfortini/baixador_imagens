import type { Car } from '../types/car';

const API_BASE = '/api';

export interface RefreshInventoryResponse {
  alreadyRunning: boolean;
  refreshedAt: string;
  inventory: {
    filePath: string;
    generatedAt: string;
    totalCars: number;
  };
}

export async function fetchCars(signal?: AbortSignal): Promise<Car[]> {
  const response = await fetch(`${API_BASE}/cars`, { signal });

  if (!response.ok) {
    throw new Error(`Falha ao buscar carros: HTTP ${response.status}`);
  }

  return (await response.json()) as Car[];
}

export async function refreshInventory(): Promise<RefreshInventoryResponse> {
  const response = await fetch(`${API_BASE}/refresh`, {
    body: JSON.stringify({ headless: true }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Falha ao atualizar o estoque: HTTP ${response.status}`);
  }

  return (await response.json()) as RefreshInventoryResponse;
}
