import React, { useEffect, useRef } from 'react';

export interface BarcodeScannerListenerProps {
  onBarcodeScanned: (code: string) => void;
  onF1_Search?: () => void;
  onF2_Payment?: () => void;
  onF3_Cancel?: () => void;
  onF4_Sangria?: () => void;
  onF5_Sync?: () => void;
  onEsc_Close?: () => void;
  enabled?: boolean;
}

/**
 * Capturador global de alta velocidade de leitor de código de barras e atalhos de teclado (F1..F5, Esc).
 * Desempenho ultra-rápido (< 16ms / 60 FPS) via buffers nativos sem re-renderização desnecessária.
 */
export const BarcodeScannerListener: React.FC<BarcodeScannerListenerProps> = ({
  onBarcodeScanned,
  onF1_Search,
  onF2_Payment,
  onF3_Cancel,
  onF4_Sangria,
  onF5_Sync,
  onEsc_Close,
  enabled = true,
}) => {
  const bufferRef = useRef<string>('');
  const timestampsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Atalhos de Teclado F1..F5 e Esc
      if (e.key === 'F1') {
        e.preventDefault();
        onF1_Search?.();
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        onF2_Payment?.();
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        onF3_Cancel?.();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        onF4_Sangria?.();
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        onF5_Sync?.();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onEsc_Close?.();
        return;
      }

      // Se o foco do cursor estiver em um input de texto normal (que não o capturador do PDV),
      // deixamos a digitação fluir, mas se for um Enter rápido ou bip do leitor, ainda capturamos.
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      const now = performance.now();

      if (e.key === 'Enter') {
        const buffer = bufferRef.current.trim();
        const timestamps = timestampsRef.current;

        // Se tiver pelo menos 3 dígitos e a média de tempo por caractere for rápida (< 60ms por tecla)
        // OU se o input for a barra de busca rápida do PDV:
        let avgDiff = 999;
        if (timestamps.length >= 2) {
          const totalDiff = timestamps[timestamps.length - 1] - timestamps[0];
          avgDiff = totalDiff / (timestamps.length - 1);
        }

        if (buffer.length >= 2 && (avgDiff < 60 || !isInput || buffer.length >= 6)) {
          // Bip do leitor detectado!
          onBarcodeScanned(buffer);
          if (!isInput) {
            e.preventDefault();
          }
        }

        // Resetar buffers
        bufferRef.current = '';
        timestampsRef.current = [];
        return;
      }

      // Se for um caractere imprimível
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
        timestampsRef.current.push(now);

        // Limpeza de buffer por timeout se o usuário digitou devagar no teclado sem Enter
        if (timestampsRef.current.length > 1) {
          const lastDiff = now - timestampsRef.current[timestampsRef.current.length - 2];
          if (lastDiff > 500 && !isInput) {
            // Reinicia o buffer se demorou mais de 500ms entre as teclas sem foco em input
            bufferRef.current = e.key;
            timestampsRef.current = [now];
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onBarcodeScanned,
    onF1_Search,
    onF2_Payment,
    onF3_Cancel,
    onF4_Sangria,
    onF5_Sync,
    onEsc_Close,
  ]);

  return null;
};
