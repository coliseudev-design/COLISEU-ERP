import { safeInvoke as invoke } from "./ipc";

export interface PessoaInput {
  id?: string;
  empresa_id: string;
  tipo_cadastro: 'CLIENTE' | 'FORNECEDOR' | 'PRODUTOR' | 'REVENDEDOR' | 'FUNCIONARIO' | 'PORTADOR' | 'TRANSPORTADOR' | 'CLIENTE_FORNECEDOR';
  tipo: 'FISICA' | 'JURIDICA';
  nome_razaosocial: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  foto_base64?: string;
  codigo_interno?: string;

  // Pessoa Física
  sexo?: string;
  rg?: string;
  rg_orgao_emissor?: string;
  rg_data_emissao?: string;
  data_nascimento?: string;
  naturalidade?: string;
  estado_civil?: string;
  nome_mae?: string;
  profissao?: string;

  // Pessoa Jurídica
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  inscricao_suframa?: string;
  cnae_principal?: string;
  data_fundacao?: string;
  optante_simples?: boolean;

  // Endereço Principal
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  codigo_ibge?: string;
  pais?: string;

  // Contato
  email?: string;
  email_principal?: string;
  email_financeiro?: string;
  telefone?: string;
  telefone_fixo?: string;
  celular?: string;
  whatsapp?: string;
  site?: string;

  // Crédito
  limite_credito?: number;
  limite_credito_validade?: string;
  classificacao_credito?: string;
  dia_vencimento_preferencial?: number;
  dias_aviso_antes_vencimento?: number;
  score_credito?: number;

  // Comercial
  vendedor_id?: string;
  regiao?: string;
  convenio?: string;
  classe?: string;
  tabela_preco_id?: string;

  // Fiscal
  contribuinte_icms?: string;
  substituto_tributario?: boolean;
  consumidor_final?: boolean;

  observacoes?: string;
  observacoes_internas?: string;
}

export interface VeiculoPessoa {
  id: string;
  pessoa_id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano_fabricacao?: number;
  ano_modelo?: number;
  renavam?: string;
  cor?: string;
  km_atual: number;
}

export interface CnpjBrasilApiData {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cnae_fiscal_descricao?: string;
  opcao_pelo_simples?: boolean;
}

export interface ViaCepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  erro?: boolean;
}

export const pessoasService = {
  async salvarPessoa(input: PessoaInput): Promise<string> {
    return await invoke<string>("salvar_pessoa", { input });
  },

  async listarPessoas(empresaId: string, filtroTipo?: string): Promise<PessoaInput[]> {
    return await invoke<PessoaInput[]>("listar_pessoas", { empresaId, filtroTipo });
  },

  async salvarVeiculoPessoa(
    pessoaId: string,
    placa: string,
    modelo: string,
    marca: String,
    anoFabricacao?: number,
    renavam?: string,
    cor?: string
  ): Promise<string> {
    return await invoke<string>("salvar_veiculo_pessoa", {
      pessoaId,
      placa,
      modelo,
      marca,
      anoFabricacao,
      renavam,
      cor,
    });
  },

  async listarVeiculosPessoa(pessoaId: string): Promise<VeiculoPessoa[]> {
    return await invoke<VeiculoPessoa[]>("listar_veiculos_pessoa", { pessoaId });
  },

  /// Auto-fill CNPJ via BrasilAPI gratuita
  async consultarCnpjGratuito(cnpj: string): Promise<CnpjBrasilApiData | null> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return null;
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async consultarBrasilApiCnpj(cnpj: string): Promise<any> {
    return await this.consultarCnpjGratuito(cnpj);
  },

  /// Auto-fill CEP via ViaCEP gratuita
  async consultarCepGratuito(cep: string): Promise<ViaCepData | null> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.erro) return null;
      return data;
    } catch {
      return null;
    }
  },

  async consultarViaCep(cep: string): Promise<any> {
    return await this.consultarCepGratuito(cep);
  },
};
