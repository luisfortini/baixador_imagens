import type { Car } from '../types/car';

interface CarImagePickerProps {
  car: Car | null;
  selectedImage: string | null;
  onSelectImage: (imageUrl: string) => void;
}

export function CarImagePicker({ car, onSelectImage, selectedImage }: CarImagePickerProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Galeria do carro</span>
          <h2>Escolha a foto principal</h2>
        </div>
        <span className="panel-counter">{car?.images.length || 0}</span>
      </div>

      {!car ? <p className="panel-feedback">Selecione um carro para visualizar as imagens.</p> : null}
      {car && !car.images.length ? (
        <p className="panel-feedback">Esse carro nao possui imagens disponiveis no momento.</p>
      ) : null}

      {car?.images.length ? (
        <div className="image-picker-grid">
          {car.images.map((imageUrl, index) => {
            const isSelected = imageUrl === selectedImage;

            return (
              <button
                key={imageUrl}
                aria-label={`Selecionar imagem ${index + 1}`}
                className={`image-thumb ${isSelected ? 'is-selected' : ''}`}
                type="button"
                onClick={() => onSelectImage(imageUrl)}
              >
                <img alt={`${car.name} ${index + 1}`} loading="lazy" src={imageUrl} />
                <span>{String(index + 1).padStart(2, '0')}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
