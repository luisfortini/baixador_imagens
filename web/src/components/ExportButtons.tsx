import { useState } from 'react';

import { downloadOriginalImage, downloadStory } from '../lib/export';
import type { ExportFormat } from '../types/story';

interface ExportButtonsProps {
  disabled: boolean;
  fileNameBase: string;
  previewRef: React.RefObject<HTMLDivElement>;
  selectedImages: string[];
  onSelectExportImage: (imageUrl: string) => void;
  resolveFileName?: (imageUrl: string, exportIndex: number) => string;
  resolveOriginalFileName?: (imageUrl: string, exportIndex: number) => string;
  onExportComplete?: () => void;
}

export function ExportButtons({
  disabled,
  fileNameBase,
  onExportComplete,
  onSelectExportImage,
  previewRef,
  resolveFileName,
  resolveOriginalFileName,
  selectedImages,
}: ExportButtonsProps) {
  const [exporting, setExporting] = useState<ExportFormat | 'original' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedCount = selectedImages.length;

  async function handleExport(format: ExportFormat | 'original') {
    if (disabled || !selectedImages.length) {
      return;
    }

    try {
      setExporting(format);
      setMessage(null);

      if (format === 'original') {
        for (const [index, imageUrl] of selectedImages.entries()) {
          await downloadOriginalImage(
            imageUrl,
            resolveOriginalFileName?.(imageUrl, index) ||
              `${fileNameBase.replace(/-story$/i, '')}-foto-${String(index + 1).padStart(2, '0')}`,
          );
        }

        setMessage(
          selectedImages.length > 1
            ? `${selectedImages.length} imagens originais em PNG baixadas com sucesso.`
            : 'Imagem original em PNG baixada com sucesso.',
        );
        return;
      }

      if (!previewRef.current) {
        return;
      }

      for (const [index, imageUrl] of selectedImages.entries()) {
        onSelectExportImage(imageUrl);

        await downloadStory(
          previewRef.current,
          format,
          resolveFileName?.(imageUrl, index) ||
            (selectedImages.length > 1
              ? `${fileNameBase}-${String(index + 1).padStart(2, '0')}`
              : fileNameBase),
          imageUrl,
        );
      }

      setMessage(
        selectedImages.length > 1
          ? `${selectedImages.length} arquivos ${format.toUpperCase()} exportados com sucesso.`
          : `Arquivo ${format.toUpperCase()} exportado com sucesso.`,
      );
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : 'Nao foi possivel exportar a arte final.';
      setMessage(nextMessage);
    } finally {
      onExportComplete?.();
      setExporting(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Exportacao</span>
          <h2>Baixe as artes e originais</h2>
        </div>
      </div>

      <div className="export-actions">
        <button
          className="primary-button"
          disabled={disabled || exporting !== null}
          type="button"
          onClick={() => handleExport('png')}
        >
          {exporting === 'png'
            ? 'Gerando PNG...'
            : selectedCount > 1
              ? `Baixar ${selectedCount} PNGs`
              : 'Baixar PNG'}
        </button>

        <button
          className="secondary-button"
          disabled={disabled || exporting !== null}
          type="button"
          onClick={() => handleExport('jpg')}
        >
          {exporting === 'jpg'
            ? 'Gerando JPG...'
            : selectedCount > 1
              ? `Baixar ${selectedCount} JPGs`
              : 'Baixar JPG'}
        </button>

        <button
          className="secondary-button"
          disabled={disabled || exporting !== null}
          type="button"
          onClick={() => handleExport('original')}
        >
          {exporting === 'original'
            ? 'Convertendo para PNG...'
            : selectedCount > 1
              ? `Baixar ${selectedCount} originais em PNG`
              : 'Baixar original em PNG'}
        </button>
      </div>

      <p className="panel-feedback">
        {message ||
          (selectedCount > 1
            ? `Exporte ${selectedCount} stories em PNG/JPG ou baixe as imagens originais sem tarja em PNG.`
            : 'Exporte o story em alta resolucao ou baixe a imagem original sem tarja em PNG.')}
      </p>
    </section>
  );
}
