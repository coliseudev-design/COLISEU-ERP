import { invoke } from "@tauri-apps/api/core";

// ==================== TYPES ====================

export type TipoFuncionario = 
  | 'USUARIO' | 'FUNCIONARIO' | 'VENDEDOR' | 'MOTORISTA' 
  | 'RESP_TECNICO' | 'ENCARREGADO' | 'REPRESENTANTE';

export type StatusFuncionario = 
  | 'ATIVO' | 'INATIVO' | 'BLOQUEADO' | 'FERIAS' | 'AFASTADO' | 'DEMITIDO';

export type TipoVendedor = 'INTERNO' | 'EXTERNO_PJ' | 'REPRESENTANTE';

export type TipoCalculoComissao = 
  | 'PERCENTUAL_DIRETO' | 'MARGEM_LUCRO' | 'POR_CATEGORIA' | 'ESCALONADO';

export interface Funcionario {
  id: string;
  codigo: string;
  nome: string;
  apelido?: string;
  tipo_pessoa: string;
  cpf_cnpj?: string;
  rg?: string;
  cnh?: string;
  data_nascimento?: string;
  estado_civil?: string;
  genero?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  // Profissional
  tipo_funcionario: TipoFuncionario;
  cargo?: string;
  departamento?: string;
  salario: number;
  data_admissao?: string;
  data_demissao?: string;
  formacao?: string;
  pis_pasep?: string;
  ctps_numero?: string;
  ctps_serie?: string;
  // Acesso
  username?: string;
  grupo_acesso_id?: string;
  grupo_acesso_nome?: string;
  tem_acesso_sistema: number;
  status: StatusFuncionario;
  forcar_troca_senha: number;
  data_validade_acesso?: string;
  ultimo_login?: string;
  tentativas_login_falhas: number;
  // Comissões
  vendedor_codigo?: string;
  tipo_vendedor?: string;
  comissao_percentual: number;
  comissao_tipo_calculo: string;
  comissao_libera_emissao_pct: number;
  comissao_libera_baixa_pct: number;
  comissao_desconta_icms: number;
  comissao_desconta_pis_cofins: number;
  comissao_inclui_ipi: number;
  comissao_dia_pagamento: number;
  supervisor_id?: string;
  gerente_id?: string;
  desconto_maximo_permitido: number;
  banco_favorecido?: string;
  agencia?: string;
  conta_corrente?: string;
  chave_pix?: string;
  // Multi-filial
  empresa_id: string;
  filial_padrao_id?: string;
  acesso_todas_empresas: number;
  caixa_pdv_vinculado?: string;
}

export interface GrupoAcesso {
  id: string;
  nome: string;
  descricao?: string;
  is_sistema: number;
  ativo: number;
  percentual_max_desconto: number;
  total_usuarios: number;
}

export interface GrupoAcessoPermissao {
  id?: string;
  grupo_id: string;
  permissao_key: string;
  concedida: number; // 1 or 0
}

export interface PermissaoDef {
  key: string;
  label: string;
  descricao?: string;
}

export interface CategoriaPermissao {
  id: string;
  nome: string;
  icone: string;
  permissoes: PermissaoDef[];
}

export const CATALOGO_PERMISSOES: CategoriaPermissao[] = [
  {
    id: 'pdv',
    nome: 'Caixa PDV',
    icone: '🖥️',
    permissoes: [
      { key: 'pdv.abrir_caixa', label: 'Abertura de Caixa' },
      { key: 'pdv.fechar_caixa', label: 'Fechamento de Caixa' },
      { key: 'pdv.vender', label: 'Atendimento / Vendas no PDV' },
      { key: 'pdv.cancelar_venda', label: 'Cancelar Venda no PDV' },
      { key: 'pdv.aplicar_desconto', label: 'Aplicar Desconto Manual no PDV' },
      { key: 'pdv.permitir_desconto_acima_alcada', label: 'Permitir Desconto Maior que o Permitido no PDV' },
      { key: 'pdv.sangria', label: 'Efetuar Sangria de Caixa' },
      { key: 'pdv.suprimento', label: 'Efetuar Suprimento de Caixa' },
      { key: 'pdv.venda_contingencia', label: 'Autorizar Venda em Contingência Offline' },
      { key: 'pdv.retransmitir_contingencia', label: 'Retransmitir Documentos em Contingência' },
      { key: 'pdv.venda_crediario', label: 'Conceder Venda no Crediário / Boleto' },
    ]
  },
  {
    id: 'vendas',
    nome: 'Vendas & Pedidos',
    icone: '📋',
    permissoes: [
      { key: 'vendas.criar_pedido', label: 'Criar Pedido / Orçamento' },
      { key: 'vendas.editar_pedido', label: 'Editar Pedido Existente' },
      { key: 'vendas.excluir_pedido', label: 'Excluir Pedido' },
      { key: 'vendas.aprovar_pedido', label: 'Aprovar Pedido / Orçamento' },
      { key: 'vendas.faturar_nfe', label: 'Faturar Pedido (Emitir NF-e)' },
      { key: 'vendas.emitir_acobertamento', label: 'Emitir NF-e de Acobertamento' },
      { key: 'vendas.alterar_preco_venda', label: 'Alterar Preço do Produto na Venda' },
      { key: 'vendas.alterar_vendedor', label: 'Alterar Vendedor do Pedido' },
      { key: 'vendas.permitir_desconto_acima_alcada', label: 'Permitir Desconto Maior que o Permitido no Pedido' },
      { key: 'vendas.reimprimir_danfe', label: 'Reimprimir DANFE de Venda' },
    ]
  },
  {
    id: 'condicional',
    nome: 'Pré-Venda & Condicional',
    icone: '🧾',
    permissoes: [
      { key: 'prevenda.emitir_comanda', label: 'Emitir Comanda de Pré-Venda' },
      { key: 'condicional.emitir_malinha', label: 'Emitir Saída de Venda Condicional (Malinha)' },
      { key: 'condicional.faturar', label: 'Faturar Condicional Não Devolvida' },
      { key: 'condicional.gerar_vale', label: 'Gerar Vale-Troca / Crédito de Loja' },
      { key: 'condicional.devolver', label: 'Registrar Devolução de Condicional' },
    ]
  },
  {
    id: 'clientes',
    nome: 'Clientes & Parceiros',
    icone: '👥',
    permissoes: [
      { key: 'clientes.cadastrar', label: 'Cadastrar Cliente / Parceiro' },
      { key: 'clientes.editar', label: 'Alterar Cadastro do Cliente' },
      { key: 'clientes.excluir', label: 'Excluir Cadastro de Cliente' },
      { key: 'clientes.alterar_limite_credito', label: 'Alterar Limite de Crédito' },
      { key: 'clientes.bloquear', label: 'Bloquear / Desbloquear Inadimplente' },
      { key: 'clientes.alterar_tipo', label: 'Alterar Tipo no Cadastro de Clientes' },
      { key: 'clientes.consultar_receita', label: 'Consultar CNPJ na Receita Federal / SEFAZ' },
    ]
  },
  {
    id: 'produtos',
    nome: 'Catálogo & Produtos',
    icone: '📦',
    permissoes: [
      { key: 'produtos.cadastrar', label: 'Cadastrar Produto' },
      { key: 'produtos.editar', label: 'Alterar Dados de Produtos' },
      { key: 'produtos.excluir', label: 'Excluir Produto' },
      { key: 'produtos.ver_custo', label: 'Visualizar Custo Médio / Margens de Lucro' },
      { key: 'produtos.alterar_preco', label: 'Alterar Preço do Produto' },
      { key: 'produtos.alterar_preco_lote', label: 'Reajustar Preços em Lote' },
      { key: 'produtos.alterar_tributacao', label: 'Alterar Tributação / Alíquotas do Produto' },
      { key: 'produtos.gerar_etiquetas', label: 'Gerar Etiquetas de Código de Barras' },
    ]
  },
  {
    id: 'estoque',
    nome: 'Estoque & Depósitos',
    icone: '📊',
    permissoes: [
      { key: 'estoque.ver_saldos', label: 'Visualizar Saldos de Estoque' },
      { key: 'estoque.ajustar', label: 'Ajustar Estoque Manual' },
      { key: 'estoque.ajustar_lote', label: 'Ajustar Estoque do Lote' },
      { key: 'estoque.transferir', label: 'Transferir Estoque entre Depósitos/Filiais' },
      { key: 'estoque.balanco_executar', label: 'Executar Balanço / Contagem Física' },
      { key: 'estoque.balanco_ajustar', label: 'Aplicar Ajustes do Balanço ao Saldo Oficial' },
      { key: 'estoque.entrada_mercadoria', label: 'Entrada de Mercadoria (via XML / Manual)' },
      { key: 'estoque.categorias_marcas', label: 'Gerenciar Categorias, Subcategorias e Marcas' },
    ]
  },
  {
    id: 'fin_receber',
    nome: 'Financeiro — Contas a Receber',
    icone: '💰',
    permissoes: [
      { key: 'fin_receber.visualizar', label: 'Visualizar Contas a Receber' },
      { key: 'fin_receber.lancar', label: 'Lançar Título a Receber Manual' },
      { key: 'fin_receber.liquidar', label: 'Liquidar / Baixar Títulos a Receber' },
      { key: 'fin_receber.estornar', label: 'Estornar Quitação / Baixa de Título' },
      { key: 'fin_receber.renegociar', label: 'Renegociar / Parcelar Dívidas de Clientes' },
      { key: 'fin_receber.excluir', label: 'Excluir Título a Receber' },
      { key: 'fin_receber.emitir_recibo', label: 'Emitir / Reemitir Recibo de Quitação' },
    ]
  },
  {
    id: 'fin_pagar',
    nome: 'Financeiro — Contas a Pagar',
    icone: '💳',
    permissoes: [
      { key: 'fin_pagar.visualizar', label: 'Visualizar Contas a Pagar' },
      { key: 'fin_pagar.lancar', label: 'Lançar Título a Pagar Manual' },
      { key: 'fin_pagar.liquidar', label: 'Pagar / Baixar Título a Pagar' },
      { key: 'fin_pagar.retencoes', label: 'Gerenciar Retenções Tributárias (DARF WHT)' },
      { key: 'fin_pagar.excluir', label: 'Excluir Título a Pagar' },
    ]
  },
  {
    id: 'fin_geral',
    nome: 'Financeiro — Geral & Bancos',
    icone: '🏦',
    permissoes: [
      { key: 'fin.caixas_gerir', label: 'Cadastrar e Gerenciar Caixas PDV' },
      { key: 'fin.bancos_gerir', label: 'Cadastrar e Gerenciar Contas Bancárias' },
      { key: 'fin.ofx_importar', label: 'Importar OFX / Conciliação Bancária' },
      { key: 'fin.dre_visualizar', label: 'Visualizar DRE Gerencial' },
      { key: 'fin.fluxo_caixa', label: 'Visualizar Fluxo de Caixa Projetado' },
      { key: 'fin.pix_boleto', label: 'Gerenciar Cobrança PIX Dinâmico / Boletos' },
    ]
  },
  {
    id: 'fiscal_nfe',
    nome: 'Fiscal — NF-e (Modelo 55)',
    icone: '🧾',
    permissoes: [
      { key: 'fiscal.nfe_emitir', label: 'Emitir NF-e (Modelo 55)' },
      { key: 'fiscal.nfe_cancelar', label: 'Cancelar NF-e na SEFAZ' },
      { key: 'fiscal.nfe_cce', label: 'Emitir Carta de Correção Eletrônica (CC-e)' },
      { key: 'fiscal.nfe_inutilizar', label: 'Inutilizar Numeração de NF-e' },
      { key: 'fiscal.nfe_configurar', label: 'Configurar Parâmetros de NF-e' },
      { key: 'fiscal.xml_exportar', label: 'Exportar XMLs para Contabilidade' },
    ]
  },
  {
    id: 'fiscal_nfce',
    nome: 'Fiscal — NFC-e (Modelo 65)',
    icone: '🧾',
    permissoes: [
      { key: 'fiscal.nfce_cancelar', label: 'Cancelar NFC-e / Cupom Fiscal na SEFAZ' },
      { key: 'fiscal.nfce_inutilizar', label: 'Inutilizar Numeração de NFC-e' },
      { key: 'fiscal.nfce_sync_contingencia', label: 'Sincronizar / Transmitir Contingência NFC-e' },
      { key: 'fiscal.nfce_configurar', label: 'Configurar Parâmetros de NFC-e (CSC/Token)' },
    ]
  },
  {
    id: 'fiscal_mdfe',
    nome: 'Fiscal — MDF-e (Modelo 58)',
    icone: '🚛',
    permissoes: [
      { key: 'fiscal.mdfe_emitir', label: 'Emitir MDF-e (Manifesto Eletrônico)' },
      { key: 'fiscal.mdfe_encerrar', label: 'Encerrar MDF-e na SEFAZ' },
      { key: 'fiscal.mdfe_cancelar', label: 'Cancelar MDF-e Autorizado' },
      { key: 'fiscal.mdfe_condutor', label: 'Incluir Condutor / Motorista em MDF-e' },
    ]
  },
  {
    id: 'fiscal_regras',
    nome: 'Fiscal — Matriz Tributária & SPED',
    icone: '📐',
    permissoes: [
      { key: 'fiscal.regras_tributarias', label: 'Editar Matriz e Regras Tributárias SEFAZ' },
      { key: 'fiscal.cfop_gerir', label: 'Gerenciar Naturezas de Operação (CFOP)' },
      { key: 'fiscal.sped_gerar', label: 'Gerar Arquivo SPED Fiscal EFD ICMS/IPI' },
    ]
  },
  {
    id: 'compras',
    nome: 'Compras & Fornecedores',
    icone: '🛒',
    permissoes: [
      { key: 'compras.criar_cotacao', label: 'Criar Cotação / Pedido de Compra' },
      { key: 'compras.aprovar_pedido', label: 'Aprovar Pedido de Compra' },
      { key: 'compras.xml_entrada', label: 'Importar e Processar XML de Compra' },
      { key: 'compras.mde_manifestar', label: 'Manifestar Destinatário (MD-e)' },
      { key: 'compras.alterar_preco_compra', label: 'Alterar Preço do Produto na Compra' },
    ]
  },
  {
    id: 'os',
    nome: 'Ordens de Serviço (O.S.)',
    icone: '🔧',
    permissoes: [
      { key: 'os.criar', label: 'Abrir Nova Ordem de Serviço' },
      { key: 'os.editar', label: 'Editar O.S. e Laudo Técnico' },
      { key: 'os.concluir', label: 'Concluir Ordem de Serviço' },
      { key: 'os.faturar', label: 'Faturar O.S. para Financeiro' },
    ]
  },
  {
    id: 'comissoes',
    nome: 'Comissões & Metas',
    icone: '📊',
    permissoes: [
      { key: 'comissoes.configurar_regras', label: 'Configurar Políticas e Faixas de Comissão' },
      { key: 'comissoes.pagar', label: 'Pagar / Liquidar Comissões de Vendedores' },
      { key: 'comissoes.editar_metas', label: 'Editar Metas de Vendedores' },
    ]
  },
  {
    id: 'admin',
    nome: 'Administração & Segurança',
    icone: '⚙️',
    permissoes: [
      { key: 'admin.configuracoes_gerais', label: 'Alterar Configurações Globais do ERP' },
      { key: 'admin.usuarios_gerir', label: 'Gerenciar Funcionários e Usuários' },
      { key: 'admin.grupos_gerir', label: 'Gerenciar Grupos de Acesso e Permissões' },
      { key: 'admin.alterar_senha', label: 'Alterar Senha de Outros Usuários' },
      { key: 'admin.audit_visualizar', label: 'Visualizar Trilha de Auditoria e Logs' },
      { key: 'admin.ia_configurar', label: 'Configurar Provedores de IA' },
      { key: 'admin.whatsapp_configurar', label: 'Configurar Gateway WhatsApp' },
      { key: 'admin.backup', label: 'Executar Backup do Banco de Dados' },
      { key: 'admin.series_fiscais', label: 'Alterar Séries e Numeração Fiscal' },
    ]
  }
];

export interface FuncionarioMeta {
  id: string;
  funcionario_id: string;
  tipo_periodo: string;
  ano: number;
  periodo: number;
  meta_faturamento: number;
  meta_quantidade: number;
  meta_margem_minima: number;
  meta_novos_clientes: number;
  categoria_produto_id?: string;
}

export interface FuncionarioFilial {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  filial_id?: string;
  is_default: number;
}

export interface LoginResult {
  funcionario: Funcionario;
  permissoes: GrupoAcessoPermissao[];
  filiais_permitidas: FuncionarioFilial[];
}

// ==================== SERVICE ====================

export const funcionariosService = {
  async autenticar(username: string, senha: string): Promise<LoginResult> {
    return await invoke<LoginResult>("autenticar_funcionario", { username, senha });
  },

  async listar(empresaId: string): Promise<Funcionario[]> {
    return await invoke<Funcionario[]>("listar_funcionarios", { empresaId });
  },

  async salvar(funcionario: Funcionario, senhaPlain?: string): Promise<Funcionario> {
    return await invoke<Funcionario>("salvar_funcionario", { funcionario, senhaPlain });
  },

  async bloquear(funcionarioId: string): Promise<void> {
    return await invoke<void>("bloquear_funcionario", { funcionarioId });
  },

  async desbloquear(funcionarioId: string): Promise<void> {
    return await invoke<void>("desbloquear_funcionario", { funcionarioId });
  },

  async resetarSenha(funcionarioId: string, novaSenha: string): Promise<void> {
    return await invoke<void>("resetar_senha_funcionario", { funcionarioId, novaSenha });
  },

  // Grupos de Acesso
  async listarGrupos(): Promise<GrupoAcesso[]> {
    return await invoke<GrupoAcesso[]>("listar_grupos_acesso");
  },

  async salvarGrupo(grupo: GrupoAcesso, permissoes: GrupoAcessoPermissao[]): Promise<GrupoAcesso> {
    return await invoke<GrupoAcesso>("salvar_grupo_acesso", { grupo, permissoes });
  },

  async excluirGrupo(grupoId: string): Promise<void> {
    return await invoke<void>("excluir_grupo_acesso", { grupoId });
  },

  async listarPermissoesGrupo(grupoId: string): Promise<GrupoAcessoPermissao[]> {
    return await invoke<GrupoAcessoPermissao[]>("listar_permissoes_grupo", { grupoId });
  },

  async verificarPermissao(funcionarioId: string, permissaoKey: string): Promise<boolean> {
    return await invoke<boolean>("verificar_permissao", { funcionarioId, permissaoKey });
  },

  // Metas
  async listarMetas(funcionarioId: string, ano: number): Promise<FuncionarioMeta[]> {
    return await invoke<FuncionarioMeta[]>("listar_funcionario_metas", { funcionarioId, ano: Math.floor(ano) });
  },

  async salvarMeta(meta: FuncionarioMeta): Promise<FuncionarioMeta> {
    return await invoke<FuncionarioMeta>("salvar_funcionario_meta", { meta });
  },

  // Filiais
  async listarFiliais(funcionarioId: string): Promise<FuncionarioFilial[]> {
    return await invoke<FuncionarioFilial[]>("listar_funcionario_filiais", { funcionarioId });
  },

  async salvarFilial(filial: FuncionarioFilial): Promise<FuncionarioFilial> {
    return await invoke<FuncionarioFilial>("salvar_funcionario_filial", { filial });
  },
};

// Default empty funcionario factory
export function createEmptyFuncionario(empresaId: string): Funcionario {
  return {
    id: '',
    codigo: '',
    nome: '',
    tipo_pessoa: 'FISICA',
    tipo_funcionario: 'FUNCIONARIO',
    salario: 0,
    tem_acesso_sistema: 0,
    status: 'ATIVO',
    forcar_troca_senha: 0,
    tentativas_login_falhas: 0,
    comissao_percentual: 0,
    comissao_tipo_calculo: 'PERCENTUAL_DIRETO',
    comissao_libera_emissao_pct: 0,
    comissao_libera_baixa_pct: 100,
    comissao_desconta_icms: 1,
    comissao_desconta_pis_cofins: 1,
    comissao_inclui_ipi: 0,
    comissao_dia_pagamento: 10,
    desconto_maximo_permitido: 0,
    empresa_id: empresaId,
    acesso_todas_empresas: 0,
    uf: 'MS',
  };
}
