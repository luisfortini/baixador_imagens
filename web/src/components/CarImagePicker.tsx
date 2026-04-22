import type { Car } from '../types/car';

interface CarImagePickerProps {
  car: Car | null;
  previewImage: string | null;
  selectedImages: string[];
  onPreviewImage: (imageUrl: string) => void;
  onToggleImageSelection: (imageUrl: string) => void;
  onSelectAllImages: () => void;
  onClearImageSelection: () => void;
}

export function CarImagePicker({
  car,
  onClearImageSelection,
  onPreviewImage,
  onSelectAllImages,
  onToggleImageSelection,
  previewImage,
  selectedImages,
}: CarImagePickerProps) {
  const totalImages = car?.images.length || 0;
  const selectedCount = selectedImages.length;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Galeria do carro</span>
          <h2>Monte o lote de imagens</h2>
        </div>
        <span className="panel-counter">
          {selectedCount}/{totalImages}
        </span>
      </div>

      {!car ? <p className="panel-feedback">Selecione um carro para visualizar as imagens.</p> : null}
      {car && !car.images.length ? (
        <p className="panel-feedback">Esse carro nao possui imagens disponiveis no momento.</p>
      ) : null}

      {car?.images.length ? (
        <>
          <div className="image-picker-toolbar">
            <p className="panel-feedback">
              Clique na miniatura para atualizar o preview e use Selecionar para incluir a foto no
              lote de exportacao.
            </p>

            <div className="image-picker-toolbar__actions">
              <button className="ghost-button" type="button" onClick={onSelectAllImages}>
                Selecionar todas
              </button>
              <button
                className="ghost-button"
                disabled={!selectedCount}
                type="button"
                onClick={onClearImageSelection}
              >
                Limpar selecao
              </button>
            </div>
          </div>

          <div className="image-picker-grid">
            {car.images.map((imageUrl, index) => {
              const isSelected = selectedImages.includes(imageUrl);
              const isPreview = imageUrl === previewImage;

              return (
                <article
                  key={imageUrl}
                  className={`image-thumb ${isSelected ? 'is-selected' : ''} ${isPreview ? 'is-preview' : ''}`}
                >
                  <button
                    aria-label={`Visualizar imagem ${index + 1} no story`}
                    className="image-thumb__preview-button"
                    type="button"
                    onClick={() => onPreviewImage(imageUrl)}
                  >
                    <img alt={`${car.name} ${index + 1}`} loading="lazy" src={imageUrl} />
                    <span className="image-thumb__index">{String(index + 1).padStart(2, '0')}</span>
                    {isPreview ? <span className="image-thumb__preview-pill">Preview</span> : null}
                  </button>

                  <button
                    aria-pressed={isSelected}
                    className={`image-thumb__selection-toggle ${isSelected ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => onToggleImageSelection(imageUrl)}
                  >
                    {isSelected ? 'Selecionada' : 'Selecionar'}
                  </button>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
