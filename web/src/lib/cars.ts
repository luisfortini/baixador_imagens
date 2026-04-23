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

export function buildCarFileNameBase(car: Car | null) {
  const seed = car?.id || car?.name || 'overtake';

  return seed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildStoryFileName(car: Car | null) {
  return `${buildCarFileNameBase(car)}-story`;
}

export function buildStoryBatchFileName(
  car: Car | null,
  imageUrl: string | null,
  selectedImagesCount: number,
) {
  const baseName = buildStoryFileName(car);

  if (!car || !imageUrl || selectedImagesCount <= 1) {
    return baseName;
  }

  const imageIndex = car.images.indexOf(imageUrl);

  if (imageIndex === -1) {
    return baseName;
  }

  return `${baseName}-foto-${String(imageIndex + 1).padStart(2, '0')}`;
}

export function buildOriginalImageFileName(car: Car | null, imageUrl: string | null) {
  const baseName = buildCarFileNameBase(car);

  if (!car || !imageUrl) {
    return baseName;
  }

  const imageIndex = car.images.indexOf(imageUrl);

  if (imageIndex === -1) {
    return baseName;
  }

  return `${baseName}-foto-${String(imageIndex + 1).padStart(2, '0')}`;
}
