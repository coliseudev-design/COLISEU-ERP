/**
 * Coliseu ERP - Fiscal Cloud & Central XML Concentrator Service Layer
 * Conecta qualquer terminal (Desktop e Web) à API Fiscal e Concentrador da VPS.
 */

const CLOUD_API_URL = typeof window !== 'undefined' && window.location.origin.includes('coliseusistemas.com.br')
  ? window.location.origin
  : 'https://erp.coliseusistemas.com.br';

export interface CertificadoA1Status {
  instalado: boolean;
  certificado?: {
    id: string;
    empresa_id: string;
    alias: string;
    cnpj: string;
    nome_titular: string;
    validade_inicio: string;
    validade_fim: string;
    diasRestantes: number;
    expirado: boolean;
  };
  message?: string;
  error?: string;
}

export interface DocumentoFiscalConcentrador {
  id: string;
  empresa_id: string;
  filial_id: string;
  modelo: string; // '55' | '65' | '57' | '58'
  serie: number;
  numero: number;
  chave_acesso: string;
  status: 'AUTORIZADO' | 'CANCELADO' | 'DENEGADO' | 'REJEITADO';
  data_emissao: string;
  data_autorizacao?: string;
  protocolo_autorizacao?: string;
  motivo_status?: string;
  destinatario_nome?: string;
  destinatario_cpf_cnpj?: string;
  valor_total: number;
  xml_caminho_relativo?: string;
  created_at: string;
}

export const fiscalCloudService = {
  /**
   * Consulta o status do certificado digital A1 ativo no cofre central da VPS
   */
  async getCertificadoStatus(empresaId = 'emp-matriz-001'): Promise<CertificadoA1Status> {
    try {
      const res = await fetch(`${CLOUD_API_URL}/api/fiscal/certificados/status?empresaId=${empresaId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      console.warn('[FiscalCloud] Falha ao consultar status do certificado:', err);
      return { instalado: false, error: err.message };
    }
  },

  /**
   * Envia o arquivo .PFX e a senha para o cofre encriptado AES-256 na VPS
   */
  async uploadCertificadoA1(payload: {
    alias: string;
    cnpj?: string;
    nomeTitular?: string;
    validadeInicio?: string;
    validadeFim?: string;
    pfxBase64: string;
    password: string;
    empresaId?: string;
  }): Promise<{ success: boolean; message: string; certificado?: any }> {
    const res = await fetch(`${CLOUD_API_URL}/api/fiscal/certificados/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha no upload do certificado para a VPS.');
    }
    return data;
  },

  /**
   * Lista todos os documentos fiscais armazenados no Concentrador Único da VPS
   */
  async fetchDocumentosFiscais(filters: {
    modelo?: string;
    status?: string;
    busca?: string;
    limit?: number;
    offset?: number;
    empresaId?: string;
  } = {}): Promise<DocumentoFiscalConcentrador[]> {
    try {
      const params = new URLSearchParams();
      if (filters.modelo) params.append('modelo', filters.modelo);
      if (filters.status) params.append('status', filters.status);
      if (filters.busca) params.append('busca', filters.busca);
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.offset) params.append('offset', String(filters.offset));
      if (filters.empresaId) params.append('empresaId', filters.empresaId);

      const res = await fetch(`${CLOUD_API_URL}/api/fiscal/documentos?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[FiscalCloud] Falha ao listar documentos do concentrador:', err);
      return [];
    }
  },

  /**
   * Baixa o arquivo XML oficial autorizado a partir de qualquer terminal
   */
  async downloadXmlOficial(chaveAcesso: string): Promise<void> {
    const url = `${CLOUD_API_URL}/api/fiscal/xml/${chaveAcesso}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chaveAcesso}-proc.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Exporta todos os XMLs de um mês e ano em pacote para a contabilidade
   */
  async exportarLoteMensal(ano: string, mes: string, modelo?: string): Promise<{
    ano: string;
    mes: string;
    totalDocumentos: number;
    documentos: any[];
  }> {
    const params = new URLSearchParams({ ano, mes });
    if (modelo) params.append('modelo', modelo);

    const res = await fetch(`${CLOUD_API_URL}/api/fiscal/exportar-mes?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  /**
   * Registra documento fiscal emitido no Concentrador Único da VPS
   */
  async registrarDocumento(payload: {
    chaveAcesso: string;
    modelo: string;
    serie: number;
    numero: number;
    status: string;
    valorTotal: number;
    destinatarioNome?: string;
    destinatarioCpfCnpj?: string;
    xmlAutorizadoTexto?: string;
    protocoloAutorizacao?: string;
    motivoStatus?: string;
    payload?: any;
    empresaId?: string;
  }): Promise<{ success: boolean; documento?: any }> {
    const res = await fetch(`${CLOUD_API_URL}/api/fiscal/documentos/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao registrar no concentrador');
    }
    return await res.json();
  },
};
