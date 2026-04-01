import type { Car } from '../types/car';

interface SearchableCarSelectProps {
  cars: Car[];
  filteredCars: Car[];
  loading: boolean;
  error: string | null;
  query: string;
  selectedCarId: string | null;
  onQueryChange: (value: string) => void;
  onSelectCar: (carId: string) => void;
}

export function SearchableCarSelect({
  cars,
  error,
  filteredCars,
  loading,
  onQueryChange,
  onSelectCar,
  query,
  selectedCarId,
}: SearchableCarSelectProps) {
  return (
    <section className="panel panel-search">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Busca de carros</span>
          <h2>Escolha o veiculo</h2>
        </div>
        <span className="panel-counter">
          {filteredCars.length}/{cars.length}
        </span>
      </div>

      <label className="search-field">
        <span>Busque por nome, descricao, titulo ou pasta</span>
        <input
          autoComplete="off"
          name="car-search"
          placeholder="Ex.: Nivus, Fastback, pronta entrega..."
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div className="car-results">
        {loading ? <p className="panel-feedback">Carregando carros...</p> : null}
        {!loading && error ? <p className="panel-feedback error">{error}</p> : null}
        {!loading && !error && !filteredCars.length ? (
          <p className="panel-feedback">Nenhum carro encontrado para essa busca.</p>
        ) : null}

        {!loading && !error
          ? filteredCars.map((car) => {
              const isSelected = car.id === selectedCarId;

              return (
                <button
                  key={car.id}
                  className={`car-result-card ${isSelected ? 'is-selected' : ''}`}
                  type="button"
                  onClick={() => onSelectCar(car.id)}
                >
                  <div className="car-result-card__top">
                    <strong>{car.name}</strong>
                    <span>{car.totalImages} imgs</span>
                  </div>
                  <p>{car.price || 'Preco a definir'}</p>
                  <small>{car.description || car.pageTitle || car.folderName}</small>
                </button>
              );
            })
          : null}
      </div>
    </section>
  );
}
