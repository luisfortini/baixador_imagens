import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';

import { CarImagePicker } from './components/CarImagePicker';
import { ExportButtons } from './components/ExportButtons';
import { SearchableCarSelect } from './components/SearchableCarSelect';
import { StoryForm } from './components/StoryForm';
import { StoryPreview } from './components/StoryPreview';
import { BRAND } from './config/brand';
import { fetchCars, refreshInventory } from './lib/api';
import {
  buildStoryFileName,
  buildStoryBatchFileName,
  createInitialStoryForm,
  filterCars,
  getPrimaryImage,
} from './lib/cars';
import type { Car } from './types/car';
import type { StoryFormValues } from './types/story';

const EMPTY_FORM: StoryFormValues = {
  displayName: '',
  factoryWarranty: false,
  ipvaPaid: false,
  price: '',
  readyDelivery: false,
  specialLine1: '',
  specialLine2: '',
};

export default function App() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<string | null>(null);
  const [inventoryStatusIsError, setInventoryStatusIsError] = useState(false);
  const [refreshingInventory, setRefreshingInventory] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [exportImage, setExportImage] = useState<string | null>(null);
  const [form, setForm] = useState<StoryFormValues>(EMPTY_FORM);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportPreviewRef = useRef<HTMLDivElement>(null);

  const deferredQuery = useDeferredValue(query);
  const filteredCars = filterCars(cars, deferredQuery);
  const selectedCar = cars.find((car) => car.id === selectedCarId) || null;

  function syncCars(nextCars: Car[]) {
    setCars(nextCars);
    setSelectedCarId((current) =>
      nextCars.some((car) => car.id === current) ? current : nextCars[0]?.id || null,
    );
  }

  async function loadCars(signal?: AbortSignal, showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);

      const nextCars = await fetchCars(signal);
      syncCars(nextCars);
      return nextCars;
    } catch (loadError) {
      if (signal?.aborted) {
        return null;
      }

      const message =
        loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar os carros.';
      setError(message);
      throw loadError;
    } finally {
      if (showLoading && !signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    loadCars(controller.signal).catch(() => undefined);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedCar) {
      setForm(EMPTY_FORM);
      setSelectedImages([]);
      setPreviewImage(null);
      setExportImage(null);
      return;
    }

    const primaryImage = getPrimaryImage(selectedCar);

    setForm(createInitialStoryForm(selectedCar));
    setSelectedImages(primaryImage ? [primaryImage] : []);
    setPreviewImage(primaryImage);
    setExportImage(null);
  }, [selectedCar?.id]);

  function handleSelectCar(carId: string) {
    startTransition(() => {
      setSelectedCarId(carId);
    });
  }

  function handleFormChange(patch: Partial<StoryFormValues>) {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleResetStory() {
    if (!selectedCar) {
      return;
    }

    const primaryImage = getPrimaryImage(selectedCar);

    setForm(createInitialStoryForm(selectedCar));
    setSelectedImages(primaryImage ? [primaryImage] : []);
    setPreviewImage(primaryImage);
    setExportImage(null);
  }

  function handlePreviewImage(imageUrl: string) {
    setPreviewImage(imageUrl);
  }

  function handleToggleImageSelection(imageUrl: string) {
    if (!selectedCar) {
      return;
    }

    const isSelected = selectedImages.includes(imageUrl);
    const nextSelectedImages = isSelected
      ? selectedImages.filter((currentImageUrl) => currentImageUrl !== imageUrl)
      : selectedCar.images.filter(
          (currentImageUrl) =>
            currentImageUrl === imageUrl || selectedImages.includes(currentImageUrl),
        );

    setSelectedImages(nextSelectedImages);
    setExportImage(null);

    if (!isSelected) {
      setPreviewImage(imageUrl);
      return;
    }

    if (previewImage === imageUrl && nextSelectedImages.length) {
      setPreviewImage(nextSelectedImages[0]);
    }
  }

  function handleSelectAllImages() {
    if (!selectedCar?.images.length) {
      return;
    }

    setSelectedImages(selectedCar.images);
    setExportImage(null);

    if (!previewImage || !selectedCar.images.includes(previewImage)) {
      setPreviewImage(selectedCar.images[0]);
    }
  }

  function handleClearImageSelection() {
    setSelectedImages([]);
    setExportImage(null);
  }

  function handleSelectExportImage(imageUrl: string) {
    setExportImage(imageUrl);
  }

  function handleFinishExport() {
    setExportImage(null);
  }

  async function handleRefreshInventory() {
    try {
      setRefreshingInventory(true);
      setInventoryStatusIsError(false);
      setInventoryStatus('Varrendo o site e atualizando o estoque...');

      const result = await refreshInventory();
      await loadCars(undefined, false);

      setInventoryStatus(
        result.alreadyRunning
          ? `Varredura ja estava em andamento. Estoque atualizado com ${result.inventory.totalCars} carros.`
          : `Estoque atualizado com ${result.inventory.totalCars} carros.`,
      );
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : 'Nao foi possivel atualizar o estoque.';

      setInventoryStatusIsError(true);
      setInventoryStatus(message);
    } finally {
      setRefreshingInventory(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Painel Administrativo</span>
          <h1>{BRAND.name} Stories Studio</h1>
          <p className="hero-copy">
            Gere stories premium em segundos usando o inventario do backend local e exporte as
            artes prontas para o Instagram.
          </p>
        </div>

        <div className="header-card">
          <span className="header-card-label">Backend alvo</span>
          <strong>{import.meta.env.VITE_BACKEND_URL || 'Proxy local /api e /downloads'}</strong>
          <span className="header-card-muted">{cars.length} carros disponiveis</span>
          <div className="header-card__actions">
            <button
              className="primary-button"
              disabled={refreshingInventory}
              type="button"
              onClick={handleRefreshInventory}
            >
              {refreshingInventory ? 'Atualizando estoque...' : 'Atualizar estoque'}
            </button>
          </div>
          {inventoryStatus ? (
            <span
              className={`header-card__status ${inventoryStatusIsError ? 'is-error' : ''}`}
            >
              {inventoryStatus}
            </span>
          ) : null}
        </div>
      </header>

      <section className="workspace-grid">
        <SearchableCarSelect
          cars={cars}
          error={error}
          filteredCars={filteredCars}
          loading={loading}
          onQueryChange={setQuery}
          onSelectCar={handleSelectCar}
          query={query}
          selectedCarId={selectedCarId}
        />

        <div className="controls-column">
          <CarImagePicker
            car={selectedCar}
            onClearImageSelection={handleClearImageSelection}
            onPreviewImage={handlePreviewImage}
            onSelectAllImages={handleSelectAllImages}
            onToggleImageSelection={handleToggleImageSelection}
            previewImage={previewImage}
            selectedImages={selectedImages}
          />

          <StoryForm
            car={selectedCar}
            form={form}
            onChange={handleFormChange}
            onReset={handleResetStory}
          />

          <ExportButtons
            disabled={!selectedCar || !selectedImages.length}
            fileNameBase={buildStoryFileName(selectedCar)}
            onExportComplete={handleFinishExport}
            onSelectExportImage={handleSelectExportImage}
            previewRef={exportPreviewRef}
            resolveFileName={(imageUrl) =>
              buildStoryBatchFileName(selectedCar, imageUrl, selectedImages.length)
            }
            selectedImages={selectedImages}
          />
        </div>

        <div className="preview-column">
          <div className="preview-stage">
            <div className="preview-stage-copy">
              <span className="eyebrow">Preview em tempo real</span>
              <h2>Story 1080 x 1920</h2>
              <p>
                A arte responde instantaneamente a mudanca de carro, foto, preco, selos e textos
                especiais.
              </p>
            </div>

            <StoryPreview
              car={selectedCar}
              form={form}
              ref={previewRef}
              selectedImage={previewImage}
            />
          </div>
        </div>
      </section>

      <div aria-hidden="true" className="story-preview-export-stage">
        <StoryPreview
          car={selectedCar}
          form={form}
          ref={exportPreviewRef}
          selectedImage={exportImage || previewImage}
        />
      </div>
    </main>
  );
}
