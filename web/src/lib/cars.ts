import { normalizeApiPrice } from './currency';
import type { Car } from '../types/car';
import type { StoryFormValues } from '../types/story';

function normalizeSearchValue(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function filterCars(cars: Car[], query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return cars;
  }

  const normalizedQuery = normalizeSearchValue(trimmedQuery);

  return cars.filter((car) =>
    [car.name, car.description, car.pageTitle, car.folderName].some((field) =>
      normalizeSearchValue(field).includes(normalizedQuery),
    ),
  );
}

export function getPrimaryImage(car: Car | null) {
  if (!car) {
    return null;
  }

  return car.coverImage || car.images[0] || null;
}

export function createInitialStoryForm(car: Car): StoryFormValues {
  return {
    displayName: car.name,
    factoryWarranty: false,
    ipvaPaid: false,
    price: normalizeApiPrice(car.price),
    readyDelivery: false,
    specialLine1: '',
    specialLine2: '',
  };
}

export function buildStoryFileName(car: Car | null) {
  const seed = car?.id || car?.name || 'overtake';

  return seed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .concat('-story');
}
