import { invoke } from '@tauri-apps/api/core';

export interface DanfeSimplificadoResult {
  success: boolean;
  chave_acesso: string;
  numero_nfe: number;
  modo_impressao: string;
  mensagem: string;
}

export async function imprimirDanfeSimplificadoTipo2(
  nfeIdOuChave: string,
  impressoraNome?: string,
  modoImpressao: 'TERMICA_ESCPOS' | 'TELA_PDF' = 'TERMICA_ESCPOS'
): Promise<DanfeSimplificadoResult> {
  return await invoke<DanfeSimplificadoResult>('imprimir_danfe_simplificado_tipo2', {
    nfeIdOuChave,
    impressoraNome: impressoraNome || null,
    modoImpressao,
  });
}
