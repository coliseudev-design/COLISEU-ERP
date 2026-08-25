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
      if (res.ok) {
        const data: CertificadoA1Status = await res.json();
        if (data.instalado && data.certificado) {
          try {
            localStorage.setItem(`coliseu_cert_vps_${empresaId}`, JSON.stringify(data));
          } catch {}
          return data;
        }
      }
    } catch (err: any) {
      console.warn('[FiscalCloud] Falha ao consultar status do certificado na nuvem:', err);
    }

    // Fallback: verificar cache persistido no cliente
    try {
      const cached = localStorage.getItem(`coliseu_cert_vps_${empresaId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.instalado && parsed?.certificado) {
          const validade = new Date(parsed.certificado.validade_fim || parsed.certificado.validadeFim);
          const diasRestantes = Math.ceil((validade.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return {
            instalado: true,
            certificado: {
              ...parsed.certificado,
              diasRestantes,
              expirado: diasRestantes <= 0,
            },
          };
        }
      }
    } catch {}

    return { instalado: false, message: 'Nenhum certificado A1 ativo cadastrado na VPS.' };
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
    const empId = payload.empresaId || 'emp-matriz-001';
    const res = await fetch(`${CLOUD_API_URL}/api/fiscal/certificados/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha no upload do certificado para a VPS.');
    }

    if (data.certificado) {
      try {
        const validade = new Date(data.certificado.validade_fim || data.certificado.validadeFim || Date.now() + 365 * 86400000);
        const diasRestantes = Math.ceil((validade.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        localStorage.setItem(
          `coliseu_cert_vps_${empId}`,
          JSON.stringify({
            instalado: true,
            certificado: {
              ...data.certificado,
              diasRestantes,
              expirado: diasRestantes <= 0,
            },
          })
        );
      } catch {}
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
    return await res.json();
  },

  /**
   * Emite e autoriza documento fiscal (NF-e, NFC-e, CT-e, MDF-e) centralizadamente na VPS
   */
  async emitirDocumentoFiscal(payload: {
    modelo: '55' | '65' | '57' | '58' | string;
    serie?: number;
    numero?: number;
    pedidoId?: string;
    itens?: any[];
    valorTotal: number;
    destinatario?: { nome?: string; cpfCnpj?: string; uf?: string };
    naturezaOperacao?: string;
    formaPagamento?: string;
    placaVeiculo?: string;
    condutorNome?: string;
    condutorCpf?: string;
    empresaId?: string;
    filialId?: string;
  }): Promise<{
    sucesso: boolean;
    message: string;
    chaveAcesso: string;
    protocolo: string;
    modelo: string;
    serie: number;
    numero: number;
    status: string;
    xmlUrl: string;
    documento: any;
  }> {
    const res = await fetch(`${CLOUD_API_URL}/api/fiscal/emitir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.sucesso) {
      throw new Error(data.error || data.message || 'Falha na emissão fiscal na VPS.');
    }
    return data;
  },
};
