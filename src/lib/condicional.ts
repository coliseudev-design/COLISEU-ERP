import { safeInvoke as invoke } from "./ipc";

export interface ItemCondicionalInput {
  produto_id: string;
  variante_id?: string;
  codigo_barras?: string;
  quantidade: number;
  preco_unitario: number;
}

export interface CondicionalItemDet {
  id: string;
  produto_id: string;
  variante_id?: string;
  codigo_barras?: string;
  quantidade_enviada: number;
  quantidade_devolvida: number;
  quantidade_faturada: number;
  preco_unitario: number;
  status: 'ENVIADO' | 'DEVOLVIDO' | 'FATURADO';
  codigo_sku?: string;
  descricao_produto?: string;
}

export interface CondicionalCompleta {
  id: string;
  filial_id: string;
  numero_condicional: string;
  cliente_id: string;
  cliente_nome?: string;
  vendedor_id?: string;
  data_saida: string;
  data_limite_devolucao: string;
  valor_total_enviado: number;
  valor_total_devolvido: number;
  valor_total_faturado: number;
  status: 'EM_ABERTO' | 'FINALIZADO_PARCIAL' | 'FINALIZADO_TOTAL';
  dias_restantes: number;
  prazo_vencido: boolean;
  itens: CondicionalItemDet[];
}

export interface ValeTrocaOutput {
  id: string;
  codigo_vale: string;
  cliente_id: string;
  valor_original: number;
  valor_bonus: number;
  valor_total_credito: number;
  saldo_disponivel: number;
  data_validade: string;
  status: string;
}

export interface MovimentoFichaFinanceira {
  id: string;
  cliente_id: string;
  origem: string;
  referencia_id?: string;
  tipo_movimento: 'DEBITO' | 'CREDITO';
  valor: number;
  historico: string;
  created_at: string;
}

export const condicionalService = {
  async criarVendaCondicional(
    filialId: string,
    clienteId: string,
    vendedorId: string | undefined,
    diasPrazo: number | undefined,
    itens: ItemCondicionalInput[]
  ): Promise<CondicionalCompleta> {
    return await invoke<CondicionalCompleta>("criar_venda_condicional", {
      filialId,
      clienteId,
      vendedorId,
      diasPrazo,
      itens,
    });
  },

  async listarCondicionaisPendentes(filialId: string): Promise<CondicionalCompleta[]> {
    return await invoke<CondicionalCompleta[]>("listar_condicionais_pendentes", { filialId });
  },

  async devolverItemPorCodigo(condicionalId: string, codigo: string): Promise<string> {
    return await invoke<string>("devolver_item_por_codigo", { condicionalId, codigo });
  },

  async faturarCondicional(condicionalId: string): Promise<number> {
    return await invoke<number>("faturar_condicional", { condicionalId });
  },

  async gerarValeTroca(
    clienteId: string,
    valorOriginal: number,
    percentualBonus: number,
    diasValidade: number
  ): Promise<ValeTrocaOutput> {
    return await invoke<ValeTrocaOutput>("gerar_vale_troca", {
      clienteId,
      valorOriginal,
      percentualBonus,
      diasValidade,
    });
  },

  async consultarFichaFinanceira(clienteId: string): Promise<MovimentoFichaFinanceira[]> {
    return await invoke<MovimentoFichaFinanceira[]>("consultar_ficha_financeira", { clienteId });
  },
};
