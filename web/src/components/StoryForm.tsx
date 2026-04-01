import { formatCurrencyInput } from '../lib/currency';
import type { Car } from '../types/car';
import type { StoryFormValues } from '../types/story';

interface StoryFormProps {
  car: Car | null;
  form: StoryFormValues;
  onChange: (patch: Partial<StoryFormValues>) => void;
  onReset: () => void;
}

export function StoryForm({ car, form, onChange, onReset }: StoryFormProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Conteudo do story</span>
          <h2>Formule a arte final</h2>
        </div>

        <button className="ghost-button" disabled={!car} type="button" onClick={onReset}>
          Resetar
        </button>
      </div>

      {!car ? <p className="panel-feedback">Selecione um carro para preencher o story.</p> : null}

      {car ? (
        <div className="story-form">
          <div className="selected-car-summary">
            <strong>{form.displayName || car.name}</strong>
            <span>{car.folderName}</span>
            <small>Nome original da API: {car.name}</small>
            <small>Preco original da API: {car.price || 'nao informado'}</small>
          </div>

          <label className="form-field">
            <span>Nome do carro no story</span>
            <input
              placeholder="Ex.: BYD King GS"
              type="text"
              value={form.displayName}
              onChange={(event) => onChange({ displayName: event.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Preco</span>
            <input
              inputMode="decimal"
              placeholder="R$ 0,00"
              type="text"
              value={form.price}
              onFocus={(event) => event.target.select()}
              onChange={(event) =>
                onChange({
                  price: formatCurrencyInput(event.target.value, form.price),
                })
              }
            />
          </label>

          <div className="checkbox-grid">
            <label className="checkbox-card">
              <input
                checked={form.ipvaPaid}
                type="checkbox"
                onChange={(event) => onChange({ ipvaPaid: event.target.checked })}
              />
              <span>IPVA 2026 PAGO</span>
            </label>

            <label className="checkbox-card">
              <input
                checked={form.readyDelivery}
                type="checkbox"
                onChange={(event) => onChange({ readyDelivery: event.target.checked })}
              />
              <span>Pronta Entrega</span>
            </label>

            <label className="checkbox-card">
              <input
                checked={form.factoryWarranty}
                type="checkbox"
                onChange={(event) => onChange({ factoryWarranty: event.target.checked })}
              />
              <span>Garantia de Fabrica</span>
            </label>
          </div>

          <label className="form-field">
            <span>Descricao especial 1</span>
            <input
              placeholder="Ex.: Taxa especial para CNPJ"
              type="text"
              value={form.specialLine1}
              onChange={(event) => onChange({ specialLine1: event.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Descricao especial 2</span>
            <input
              placeholder="Ex.: Condicao valida enquanto durarem as unidades"
              type="text"
              value={form.specialLine2}
              onChange={(event) => onChange({ specialLine2: event.target.value })}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
