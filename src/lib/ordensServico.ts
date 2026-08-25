// Gerenciador e modelo de dados de Ordens de Serviço (O.S.) & Assistência Técnica

export type StatusOS =
  | 'ORCAMENTO'
  | 'APROVADO'
  | 'EM_EXECUCAO'
  | 'AGUARDANDO_PECAS'
  | 'TESTES_QUALIDADE'
  | 'CONCLUIDO'
  | 'FATURADO'
  | 'CANCELADO';

export interface ItemPecaOS {
  id: string;
  sku: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  subtotal: number;
  localizacaoWms?: string;
}

export interface ItemServicoOS {
  id: string;
  codigo: string;
  descricao: string;
  tempoHoras: number;
  valorUnitario: number;
  subtotal: number;
  tecnicoResponsavel: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  status: 'OK' | 'AVARIADO' | 'NAO_APLICA';
  observacao?: string;
}

export interface OrdemServicoItem {
  id: string;
  numeroOS: string;
  dataAbertura: string;
  horaAbertura: string;
  dataPrevisaoEntrega: string;
  dataConclusao?: string;
  
  // Cliente
  clienteId?: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  clienteTelefone: string;
  clienteEmail?: string;
  
  // Objeto / Equipamento / Veículo
  tipoObjeto: 'VEICULO' | 'MAQUINA' | 'EQUIPAMENTO_TI' | 'ELETRODOMESTICO' | 'OUTROS';
  descricaoObjeto: string;
  marcaObjeto: string;
  modeloObjeto: string;
  placaOuSerie: string;
  corObjeto: string;
  kmOuHorimetro?: string;
  acessoriosDeixados?: string;
  
  // Relato & Laudo
  defeitoRelatado: string;
  laudoTecnico: string;
  solucaoExecutada: string;
  tecnicoPrincipal: string;
  
  // Status e Andamento
  status: StatusOS;
  prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  
  // Peças e Serviços
  pecas: ItemPecaOS[];
  servicos: ItemServicoOS[];
  checklist: ChecklistItem[];
  
  // Totais
  totalPecas: number;
  totalServicos: number;
  desconto: number;
  valorTotalOS: number;
  
  // Garantia & Condições
  garantiaDias: number;
  termoGarantia: string;
  observacoesInternas?: string;
  
  // Faturamento
  faturado: boolean;
  faturamentoData?: string;
  faturamentoForma?: string;
}

const STORAGE_KEY = 'coliseu_ordens_servico';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', item: 'Carcaça / Lataria e pintura externa sem amassados ou riscos', status: 'OK' },
  { id: '2', item: 'Tela / Vidros / Painel sem trincas', status: 'OK' },
  { id: '3', item: 'Cabos, fonte de alimentação e carregador inclusos', status: 'OK' },
  { id: '4', item: 'Nível de bateria / combustível adequado para testes', status: 'OK' },
  { id: '5', item: 'Aparelho liga e inicializa normalmente', status: 'OK' },
  { id: '6', item: 'Parafusos e travas de fixação originais presentes', status: 'OK' },
];

const DEFAULT_ORDENS_SERVICO: OrdemServicoItem[] = [];

export function getOrdensServico(): OrdemServicoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

import { syncService } from './syncService';

export function salvarOrdemServico(os: OrdemServicoItem): OrdemServicoItem[] {
  const lista = getOrdensServico();
  const index = lista.findIndex((item) => item.id === os.id);
  let atualizada: OrdemServicoItem[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = os;
  } else {
    atualizada = [os, ...lista];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_os_updated'));
  syncService.syncOrdemServico(os).catch(() => {});
  return atualizada;
}

export function excluirOrdemServico(id: string): OrdemServicoItem[] {
  const lista = getOrdensServico();
  const atualizada = lista.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_os_updated'));
  syncService.deleteOrdemServico(id).catch(() => {});
  return atualizada;
}

export function gerarProximoNumeroOS(): { id: string; numeroOS: string } {
  const lista = getOrdensServico();
  const nextNum = lista.length + 1001;
  return {
    id: `OS-${nextNum}`,
    numeroOS: `OS-${String(nextNum).padStart(6, '0')}`,
  };
}

export function getDefaultChecklist(): ChecklistItem[] {
  return JSON.parse(JSON.stringify(DEFAULT_CHECKLIST));
}
