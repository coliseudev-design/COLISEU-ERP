import { safeInvoke as invoke } from "./ipc";

export interface DanfsePdfResult {
  pdf_path: string;
  chave_acesso: string;
  numero_nfse: string;
  success: boolean;
}

export async function gerarDanfsePdf(dpsId: string, outputDir?: string): Promise<DanfsePdfResult> {
  return await invoke<DanfsePdfResult>('gerar_danfse_pdf', {
    dpsId,
    outputDir: outputDir || null,
  });
}

export async function abrirDanfsePdf(pdfPath: string): Promise<void> {
  try {
    await invoke('abrir_arquivo_pdf', { pdfPath });
  } catch (err: any) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(pdfPath);
    } catch (e2) {
      console.warn('Fallback opening PDF:', e2);
      window.open(`file:///${pdfPath.replace(/\\/g, '/')}`, '_blank');
    }
  }
}

