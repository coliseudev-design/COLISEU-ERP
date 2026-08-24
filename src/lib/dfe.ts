// Gerenciador e modelo de dados de Documentos Fiscais Eletrônicos (NF-e 55, NFC-e 65, MDF-e 58)

export type ModeloDFe = '55_NFE' | '65_NFCE' | '58_MDFE';

export type StatusSefaz =
  | 'AUTORIZADA'
  | 'CANCELADA'
  | 'DENEGADA'
  | 'EM_PROCESSAMENTO'
  | 'CONTINGENCIA'
  | 'ENCERRADO';

export interface CartaCorrecaoItem {
  id: string;
  sequencial: number;
  dataHora: string;
  textoCorrecao: string;
  protocolo: string;
}

export interface ItemDFe {
  id: string;
  sku: string;
  descricao: string;
  ncm: string;
  cfop: string;
  cst: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  aliquotaIcms: number;
  valorIcms: number;
}

export interface DocumentoFiscalItem {
  id: string;
  modelo: ModeloDFe;
  numero: number;
  serie: number;
  chaveAcesso: string;
  dataEmissao: string;
  horaEmissao: string;
  naturezaOperacao: string;
  tipoOperacao: 'SAIDA' | 'ENTRADA';
  
  // Destinatário
  destinatarioNome: string;
  destinatarioCpfCnpj: string;
  destinatarioUf: string;
  destinatarioMunicipio: string;
  
  // Valores Fiscais
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorOutrasDespesas: number;
  valorDesconto: number;
  valorTotal: number;
  
  valorBaseIcms: number;
  valorIcms: number;
  valorIcmsSt: number;
  valorIpi: number;
  valorPis: number;
  valorCofins: number;
  
  // Status & SEFAZ
  statusSefaz: StatusSefaz;
  mensagemSefaz: string;
  protocoloAutorizacao?: string;
  dataAutorizacao?: string;
  motivoCancelamento?: string;
  dataCancelamento?: string;
  
  // Eventos de Carta de Correção (CC-e)
  cartasCorrecao: CartaCorrecaoItem[];
  
  // Itens
  itens: ItemDFe[];
  
  // Específicos para MDF-e (Modelo 58 - Manifesto de Carga)
  dadosMdfe?: {
    ufCarregamento: string;
    municipioCarregamento: string;
    ufDescarregamento: string;
    municipioDescarregamento: string;
    placaVeiculo: string;
    renavamVeiculo: string;
    rntrc: string;
    motoristaNome: string;
    motoristaCpf: string;
    pesoBrutoCargaKg: number;
    valorTotalCarga: number;
    chavesNfeVinculadas: string[];
    dataEncerramento?: string;
    protocoloEncerramento?: string;
  };
}

const STORAGE_KEY_DFE = 'coliseu_documentos_fiscais_dfe';

const DEFAULT_DOCUMENTOS: DocumentoFiscalItem[] = [];

export function getDocumentosFiscais(): DocumentoFiscalItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DFE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Remove any legacy mock IDs
    return parsed.filter(
      (d) => d.id !== 'DFE-1' && d.id !== 'DFE-2' && d.id !== 'DFE-3' && d.id !== 'DFE-4' && !d.chaveAcesso?.includes('1234567800019055')
    );
  } catch {
    return [];
  }
}

export function salvarDocumentoFiscal(doc: DocumentoFiscalItem): DocumentoFiscalItem[] {
  const lista = getDocumentosFiscais();
  const index = lista.findIndex((item) => item.id === doc.id);
  let atualizada: DocumentoFiscalItem[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = doc;
  } else {
    atualizada = [doc, ...lista];
  }

  localStorage.setItem(STORAGE_KEY_DFE, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_dfe_updated'));
  return atualizada;
}

export function emitirCartaCorrecao(docId: string, textoCorrecao: string): DocumentoFiscalItem | null {
  const lista = getDocumentosFiscais();
  const index = lista.findIndex((item) => item.id === docId);
  if (index < 0) return null;

  const doc = lista[index];
  const seq = doc.cartasCorrecao.length + 1;
  const cc: CartaCorrecaoItem = {
    id: `CC-${Date.now()}`,
    sequencial: seq,
    dataHora: new Date().toLocaleString('pt-BR'),
    textoCorrecao: textoCorrecao.toUpperCase(),
    protocolo: `15026000${Math.floor(100000 + Math.random() * 900000)}`,
  };

  doc.cartasCorrecao.push(cc);
  salvarDocumentoFiscal(doc);
  return doc;
}

export function cancelarDocumentoFiscal(docId: string, motivo: string): DocumentoFiscalItem | null {
  const lista = getDocumentosFiscais();
  const index = lista.findIndex((item) => item.id === docId);
  if (index < 0) return null;

  const doc = lista[index];
  doc.statusSefaz = 'CANCELADA';
  doc.motivoCancelamento = motivo.toUpperCase();
  doc.dataCancelamento = new Date().toLocaleString('pt-BR');
  doc.mensagemSefaz = '101 - Cancelamento de NF-e homologado';

  salvarDocumentoFiscal(doc);
  return doc;
}

export function encerrarMDFe(docId: string): DocumentoFiscalItem | null {
  const lista = getDocumentosFiscais();
  const index = lista.findIndex((item) => item.id === docId);
  if (index < 0) return null;

  const doc = lista[index];
  if (doc.modelo !== '58_MDFE' || !doc.dadosMdfe) return null;

  doc.statusSefaz = 'ENCERRADO';
  doc.dadosMdfe.dataEncerramento = new Date().toLocaleString('pt-BR');
  doc.dadosMdfe.protocoloEncerramento = `15026000${Math.floor(100000 + Math.random() * 900000)}`;
  doc.mensagemSefaz = '132 - Encerramento de MDF-e homologado com sucesso';

  salvarDocumentoFiscal(doc);
  return doc;
}
