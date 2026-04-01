import { forwardRef, useState } from 'react';

import { BRAND } from '../config/brand';
import type { Car } from '../types/car';
import type { StoryFormValues } from '../types/story';

interface StoryPreviewProps {
  car: Car | null;
  selectedImage: string | null;
  form: StoryFormValues;
}

export const StoryPreview = forwardRef<HTMLDivElement, StoryPreviewProps>(function StoryPreview(
  { car, form, selectedImage },
  ref,
) {
  const [logoVisible, setLogoVisible] = useState(true);

  const badges = [
    form.factoryWarranty ? 'Garantia de Fabrica' : null,
    form.ipvaPaid ? 'IPVA 2026 PAGO' : null,
    form.readyDelivery ? 'Pronta Entrega' : null,
  ].filter(Boolean);

  const specialLines = [form.specialLine1.trim(), form.specialLine2.trim()].filter(Boolean);
  const specialLayoutClass =
    specialLines.length > 1 ? 'story-preview__specials is-split' : 'story-preview__specials';
  const displayName = form.displayName.trim() || car?.name || 'Selecione um carro';

  return (
    <div className="story-preview-shell">
      <div className="story-preview" ref={ref}>
        <div className="story-preview__glow story-preview__glow--top" />
        <div className="story-preview__glow story-preview__glow--bottom" />

        <div className="story-preview__safe-area">
          <div className="story-preview__topbar">
            {logoVisible ? (
              <img
                alt={BRAND.name}
                className="story-preview__logo"
                src={BRAND.logoPath}
                onError={() => setLogoVisible(false)}
              />
            ) : (
              <div className="story-preview__wordmark">
                <span>Overtake</span>
                <strong>Motors</strong>
              </div>
            )}

            <div className="story-preview__contact">
              <span className="story-preview__tag">WhatsApp</span>
              <strong>{BRAND.whatsappDisplay}</strong>
            </div>
          </div>

          <header className="story-preview__header">
            <span className="story-preview__kicker">Novo no painel</span>
            <h2>{displayName}</h2>
          </header>

          <div className="story-preview__image-frame">
            {selectedImage ? (
              <img
                alt={`${displayName} destaque`}
                className="story-preview__car-image"
                src={selectedImage}
              />
            ) : (
              <div className="story-preview__empty-state">
                Escolha um carro e clique em uma miniatura para montar o story.
              </div>
            )}
          </div>

          <div className="story-preview__details">
            <div className="story-preview__price-card">
              <span>Valor promocional</span>
              <strong>{form.price || 'Consulte'}</strong>
            </div>

            {badges.length ? (
              <div className="story-preview__badge-row">
                {badges.map((badge) => (
                  <span key={badge} className="story-preview__badge">
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}

            {specialLines.length ? (
              <div className={specialLayoutClass}>
                {specialLines.map((line, index) => (
                  <div key={`${index + 1}-${line}`} className="story-preview__special-item">
                    <p>{line}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
