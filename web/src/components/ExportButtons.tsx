import { useState } from 'react';

import { downloadStory } from '../lib/export';
import type { ExportFormat } from '../types/story';

interface ExportButtonsProps {
  disabled: boolean;
  fileNameBase: string;
  previewRef: React.RefObject<HTMLDivElement>;
}

export function ExportButtons({ disabled, fileNameBase, previewRef }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport(format: ExportFormat) {
    if (!previewRef.current || disabled) {
      return;
    }

    try {
      setExporting(format);
      setMessage(null);
      await downloadStory(previewRef.current, format, fileNameBase);
      setMessage(`Arquivo ${format.toUpperCase()} exportado com sucesso.`);
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : 'Nao foi possivel exportar a arte final.';
      setMessage(nextMessage);
    } finally {
      setExporting(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Exportacao</span>
          <h2>Baixe a arte final</h2>
        </div>
      </div>

      <div className="export-actions">
        <button
          className="primary-button"
          disabled={disabled || exporting !== null}
          type="button"
          onClick={() => handleExport('png')}
        >
          {exporting === 'png' ? 'Gerando PNG...' : 'Baixar PNG'}
        </button>

        <button
          className="secondary-button"
          disabled={disabled || exporting !== null}
          type="button"
          onClick={() => handleExport('jpg')}
        >
          {exporting === 'jpg' ? 'Gerando JPG...' : 'Baixar JPG'}
        </button>
      </div>

      <p className="panel-feedback">
        {message || 'Exportacao em alta resolucao no formato 1080 x 1920.'}
      </p>
    </section>
  );
}
