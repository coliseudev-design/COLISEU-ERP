/**
 * Serviço de Endereçamento Logístico Físico (WMS)
 * Permite organizar e localizar produtos por Depósito, Rua, Prateleira, Nível e Posição.
 */

export interface EnderecoItem {
  id: string;
  codigoFormatado: string; // Ex: "DEPÓSITO - RUA A - PRATELEIRA 01" ou "LOJA - MOSTRUÁRIO 01"
  deposito: string;        // Ex: "DEPÓSITO CENTRAL", "LOJA / FRENTE", "MOSTRUÁRIO"
  rua?: string;            // Ex: "RUA A", "CORREDOR 01"
  prateleira?: string;     // Ex: "PRATELEIRA 01", "GÔNDOLA 02", "ESTANTE 03"
  nivel?: string;          // Ex: "NÍVEL 1 (CHÃO)", "NÍVEL 2", "NÍVEL 3 (AÉREO)"
  posicao?: string;        // Ex: "VÃO 01", "GAVETA B", "COLUNA 02"
  tipoLocacao: 'PICKING' | 'PULMAO' | 'MOSTRUARIO' | 'GERAL';
  ativo: boolean;
  observacao?: string;
}

const STORAGE_KEY_ENDERECOS = 'coliseu_enderecos_estoque';

export const ENDERECOS_PADRAO: EnderecoItem[] = [
  {
    id: 'LOC-01',
    codigoFormatado: 'LOJA - FRENTE - GÔNDOLA 01',
    deposito: 'LOJA / FRENTE',
    rua: 'CORREDOR CENTRAL',
    prateleira: 'GÔNDOLA 01',
    nivel: 'NÍVEL 2',
    posicao: 'FRENTE',
    tipoLocacao: 'PICKING',
    ativo: true,
  },
  {
    id: 'LOC-02',
    codigoFormatado: 'LOJA - FRENTE - GÔNDOLA 02',
    deposito: 'LOJA / FRENTE',
    rua: 'CORREDOR CENTRAL',
    prateleira: 'GÔNDOLA 02',
    nivel: 'NÍVEL 2',
    posicao: 'FRENTE',
    tipoLocacao: 'PICKING',
    ativo: true,
  },
  {
    id: 'LOC-03',
    codigoFormatado: 'LOJA - MOSTRUÁRIO / VITRINE',
    deposito: 'MOSTRUÁRIO',
    rua: 'ENTRADA PRINCIPAL',
    prateleira: 'VITRINE 01',
    nivel: 'NÍVEL 1',
    posicao: 'DESTAQUE',
    tipoLocacao: 'MOSTRUARIO',
    ativo: true,
  },
  {
    id: 'LOC-04',
    codigoFormatado: 'DEPÓSITO - RUA A - PRATELEIRA 01',
    deposito: 'DEPÓSITO PRINCIPAL',
    rua: 'RUA A',
    prateleira: 'PRATELEIRA 01',
    nivel: 'NÍVEL 1 (CHÃO)',
    posicao: 'VÃO 01',
    tipoLocacao: 'PICKING',
    ativo: true,
  },
  {
    id: 'LOC-05',
    codigoFormatado: 'DEPÓSITO - RUA A - PRATELEIRA 02',
    deposito: 'DEPÓSITO PRINCIPAL',
    rua: 'RUA A',
    prateleira: 'PRATELEIRA 02',
    nivel: 'NÍVEL 2',
    posicao: 'VÃO 01',
    tipoLocacao: 'PICKING',
    ativo: true,
  },
  {
    id: 'LOC-06',
    codigoFormatado: 'DEPÓSITO - RUA B - PRATELEIRA 01',
    deposito: 'DEPÓSITO PRINCIPAL',
    rua: 'RUA B',
    prateleira: 'PRATELEIRA 01',
    nivel: 'NÍVEL 1 (CHÃO)',
    posicao: 'VÃO 01',
    tipoLocacao: 'PICKING',
    ativo: true,
  },
  {
    id: 'LOC-07',
    codigoFormatado: 'DEPÓSITO - RUA B - PRATELEIRA 02',
    deposito: 'DEPÓSITO PRINCIPAL',
    rua: 'RUA B',
    prateleira: 'PRATELEIRA 02',
    nivel: 'NÍVEL 2',
    posicao: 'VÃO 02',
    tipoLocacao: 'PICKING',
    ativo: true,
  },
  {
    id: 'LOC-08',
    codigoFormatado: 'DEPÓSITO - PULMÃO AÉREO (NÍVEL 3)',
    deposito: 'DEPÓSITO PRINCIPAL',
    rua: 'RUA A',
    prateleira: 'ESTANTE ALTA',
    nivel: 'NÍVEL 3 (AÉREO)',
    posicao: 'PALETE 05',
    tipoLocacao: 'PULMAO',
    ativo: true,
  },
  {
    id: 'LOC-09',
    codigoFormatado: 'PÁTIO EXTERNO - ÁREA BÁSICA',
    deposito: 'PÁTIO EXTERNO',
    rua: 'ÁREA A',
    prateleira: 'BAIA DE TELHAS',
    nivel: 'PISO',
    posicao: 'LOTE 01',
    tipoLocacao: 'GERAL',
    ativo: true,
  },
];

export function getEnderecos(): EnderecoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENDERECOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ENDERECOS, JSON.stringify(ENDERECOS_PADRAO));
      return ENDERECOS_PADRAO;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return ENDERECOS_PADRAO;
  } catch (e) {
    console.error('Erro ao ler endereços de estoque:', e);
    return ENDERECOS_PADRAO;
  }
}

export function salvarEndereco(endereco: EnderecoItem): void {
  try {
    const enderecos = getEnderecos();
    const index = enderecos.findIndex((e) => e.id === endereco.id);
    if (index >= 0) {
      enderecos[index] = endereco;
    } else {
      enderecos.push(endereco);
    }
    localStorage.setItem(STORAGE_KEY_ENDERECOS, JSON.stringify(enderecos));
    window.dispatchEvent(new CustomEvent('coliseu_enderecos_updated', { detail: enderecos }));
  } catch (e) {
    console.error('Erro ao salvar endereço de estoque:', e);
  }
}

export function excluirEndereco(id: string): void {
  try {
    const enderecos = getEnderecos().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY_ENDERECOS, JSON.stringify(enderecos));
    window.dispatchEvent(new CustomEvent('coliseu_enderecos_updated', { detail: enderecos }));
  } catch (e) {
    console.error('Erro ao excluir endereço:', e);
  }
}

export function formatarEnderecoSlug(
  deposito: string,
  rua?: string,
  prateleira?: string,
  nivel?: string,
  posicao?: string
): string {
  const parts: string[] = [];
  if (deposito) parts.push(deposito.trim().toUpperCase());
  if (rua) parts.push(rua.trim().toUpperCase());
  if (prateleira) parts.push(prateleira.trim().toUpperCase());
  if (nivel) parts.push(nivel.trim().toUpperCase());
  if (posicao) parts.push(posicao.trim().toUpperCase());
  return parts.join(' - ');
}

export function adicionarEnderecoRapido(
  deposito: string,
  rua?: string,
  prateleira?: string,
  nivel?: string,
  posicao?: string,
  tipoLocacao: 'PICKING' | 'PULMAO' | 'MOSTRUARIO' | 'GERAL' = 'PICKING'
): EnderecoItem {
  const formatted = formatarEnderecoSlug(deposito, rua, prateleira, nivel, posicao);
  const enderecos = getEnderecos();
  const existing = enderecos.find((e) => e.codigoFormatado.toUpperCase() === formatted.toUpperCase());
  if (existing) return existing;

  const novo: EnderecoItem = {
    id: `LOC-${Date.now()}`,
    codigoFormatado: formatted,
    deposito: deposito.trim().toUpperCase(),
    rua: rua ? rua.trim().toUpperCase() : undefined,
    prateleira: prateleira ? prateleira.trim().toUpperCase() : undefined,
    nivel: nivel ? nivel.trim().toUpperCase() : undefined,
    posicao: posicao ? posicao.trim().toUpperCase() : undefined,
    tipoLocacao,
    ativo: true,
  };

  salvarEndereco(novo);
  return novo;
}
