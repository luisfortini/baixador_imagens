export interface Car {
  id: string;
  folderName: string;
  name: string;
  description: string | null;
  pageTitle: string | null;
  price: string | null;
  url: string | null;
  images: string[];
  coverImage: string | null;
  totalImages: number;
  status: string;
  updatedAt: string;
  collectedAt?: string | null;
  extractionMode?: string | null;
  savedFiles?: string[];
  sourceImageUrls?: string[];
  warnings?: string[];
  errors?: Array<{ imageUrl?: string; message: string }>;
}
