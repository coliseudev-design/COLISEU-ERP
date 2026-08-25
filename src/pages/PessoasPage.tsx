import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CustomerCommandCenter360 } from '../components/pessoas/CustomerCommandCenter360';
import { pessoasService } from '../lib/pessoas';
import { syncService } from '../lib/syncService';
import {
  Search,
  Plus,
  Filter,
  Check,
  X,
  Users,
  ShieldCheck,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Sliders,
  Truck,
  Package,
  Calendar,
  Briefcase,
  Printer,
  Car,
  Trash2,
  Edit3,
  Globe,
  Loader2,
} from 'lucide-react';
import { formatCnpjCpf, formatCurrency, parseNumber, maskCpfCnpj, validarCpfCnpj } from '../lib/formatters';

export type TipoParceiro =
  | 'CLIENTE'
  | 'FORNECEDOR'
  | 'PRODUTOR'
  | 'REVENDEDOR'
  | 'FUNCIONARIO'
  | 'PORTADOR'
  | 'TRANSPORTADOR'
  | 'CLIENTE & FORNECEDOR';

export interface PessoaUnificada {
  id: string;
  codigo: string;
  tipo: TipoParceiro;
  tipoPessoa: 'FÍSICA' | 'JURÍDICA';
  nome: string;
  nomeAbrev: string; // Nome Fantasia
  cpfCnpj: string;
  rg: string;
  orgEmis: string;
  emissaoRg: string;
  inscEstadual: string;
  inscMunicipal: string;
  naturalidade: string;
  nascimento: string;
  sexo: 'M' | 'F' | 'N/A';
  regiao: string;
  convenio: string;
  classe: string;
  vendedor: string;
  status: 'Ativo' | 'Bloqueado' | 'Em Análise';
  curva: 'Curva A (VIP)' | 'Curva B' | 'Curva C';

  // Informações de Crédito
  limiteCredito: number;
  validadeLimite: string;
  classificacao: string;
  diaVencimento: number;
  creditoUtilizado: number;
  score: number;
  ultimaCompra: string;
  diasAntes: number;

  // Informações Digitais
  emailPrincipal: string;
  emailFinanceiro: string;
  site: string;

  // Endereço Residencial / Comercial
  cep: string;
  municipio: string;
  uf: string;
  endereco: string;
  numero: string;
  bairro: string;
  complemento: string;
  foneRes: string;
  celularWhats: string;

  // Informações Profissionais
  profissao: string;
  rendaMensalLiq: number;
  localTrabalho: string;
  enderecoComercial: string;
  foneComercial: string;
  fax: string;
  tempoServicoMeses: number;
  empregoAnterior: string;

  // Filiação
  pai: string;
  mae: string;

  // Veículos / Outros
  placaVeiculo: string;
  modeloVeiculo: string;
  anoVeiculo: string;
  tabelaPreco: string;
  condicaoPagto: string;
  formaPagto: string;
  bloquearInadimplente: boolean;
  observacoes: string;
  substituto: string;
  dataCadastro: string;
}

const INITIAL_PESSOAS: PessoaUnificada[] = [
  {
    id: 'pes-001',
    codigo: '001',
    tipo: 'CLIENTE & FORNECEDOR',
    tipoPessoa: 'JURÍDICA',
    nome: 'PIVETA DISTRIBUIDORA DE TINTAS AUTOMOTIVAS LTDA',
    nomeAbrev: 'PIVETA DISTRIBUIDORA',
    cpfCnpj: '05766577000122',
    rg: '',
    orgEmis: '',
    emissaoRg: '',
    inscEstadual: '283261864',
    inscMunicipal: '123456',
    naturalidade: 'DOURADOS - MS',
    nascimento: '2010-04-15',
    sexo: 'N/A',
    regiao: 'Grande Dourados',
    convenio: 'Sem Convênio',
    classe: 'Atacado / Distribuidor',
    vendedor: 'Roberto Silva',
    status: 'Ativo',
    curva: 'Curva A (VIP)',
    limiteCredito: 50000.0,
    validadeLimite: '2027-12-31',
    classificacao: 'CLIENTE ESPECIAL VIP',
    diaVencimento: 15,
    creditoUtilizado: 14200.0,
    score: 850,
    ultimaCompra: '10/08/2026',
    diasAntes: 5,
    emailPrincipal: 'contato@pivetatintas.com.br',
    emailFinanceiro: 'financeiro@pivetatintas.com.br',
    site: 'www.pivetatintas.com.br',
    cep: '79800-000',
    municipio: 'DOURADOS',
    uf: 'MS',
    endereco: 'Av. Marcelino Pires',
    numero: '4500',
    bairro: 'Jardim Clímax',
    complemento: 'Galpão 02',
    foneRes: '(67) 3421-9000',
    celularWhats: '(67) 99826-9796',
    profissao: 'Comércio Atacadista de Tintas',
    rendaMensalLiq: 380000.0,
    localTrabalho: 'PIVETA DISTRIBUIDORA',
    enderecoComercial: 'Av. Marcelino Pires, 4500',
    foneComercial: '(67) 3421-9000',
    fax: '',
    tempoServicoMeses: 160,
    empregoAnterior: '',
    pai: '',
    mae: '',
    placaVeiculo: 'HQH-4490',
    modeloVeiculo: 'VW Delivery 11.180',
    anoVeiculo: '2023',
    tabelaPreco: 'Tabela Atacado Padrão',
    condicaoPagto: '30/60 Dias',
    formaPagto: 'Boleto Bancário',
    bloquearInadimplente: true,
    observacoes: 'Cliente e parceiro estratégico prioritário com entregas programadas.',
    substituto: 'NÃO',
    dataCadastro: '2018-05-10',
  },
  {
    id: 'pes-002',
    codigo: '002',
    tipo: 'CLIENTE',
    tipoPessoa: 'JURÍDICA',
    nome: 'AUTO PEÇAS DOURADOS LTDA',
    nomeAbrev: 'AUTO PEÇAS DOURADOS',
    cpfCnpj: '29639089000112',
    rg: '',
    orgEmis: '',
    emissaoRg: '',
    inscEstadual: '281940123',
    inscMunicipal: '',
    naturalidade: 'DOURADOS - MS',
    nascimento: '2015-08-20',
    sexo: 'N/A',
    regiao: 'Grande Dourados',
    convenio: '',
    classe: 'Varejo',
    vendedor: 'Roberto Silva',
    status: 'Bloqueado',
    curva: 'Curva B',
    limiteCredito: 20000.0,
    validadeLimite: '2026-12-31',
    classificacao: 'RESTRIÇÃO FINANCEIRA',
    diaVencimento: 10,
    creditoUtilizado: 24500.0,
    score: 420,
    ultimaCompra: '15/07/2026',
    diasAntes: 0,
    emailPrincipal: 'financeiro@autopecas.com.br',
    emailFinanceiro: 'cobranca@autopecas.com.br',
    site: '',
    cep: '79810-100',
    municipio: 'DOURADOS',
    uf: 'MS',
    endereco: 'Rua Hayel Bon Faker',
    numero: '1820',
    bairro: 'Centro',
    complemento: 'Loja',
    foneRes: '(67) 3422-5500',
    celularWhats: '(67) 99912-3344',
    profissao: 'Auto Peças e Mecânica',
    rendaMensalLiq: 65000.0,
    localTrabalho: 'AUTO PEÇAS DOURADOS',
    enderecoComercial: '',
    foneComercial: '(67) 3422-5500',
    fax: '',
    tempoServicoMeses: 90,
    empregoAnterior: '',
    pai: '',
    mae: '',
    placaVeiculo: '',
    modeloVeiculo: '',
    anoVeiculo: '',
    tabelaPreco: 'Tabela Varejo',
    condicaoPagto: 'À Vista / PIX',
    formaPagto: 'PIX',
    bloquearInadimplente: true,
    observacoes: 'Limite excedido. Títulos em atraso de duplicatas anteriores.',
    substituto: 'NÃO',
    dataCadastro: '2020-02-18',
  },
  {
    id: 'pes-003',
    codigo: '003',
    tipo: 'FORNECEDOR',
    tipoPessoa: 'JURÍDICA',
    nome: 'TINTAS BRASIL S.A. INDÚSTRIA QUÍMICA',
    nomeAbrev: 'TINTAS BRASIL',
    cpfCnpj: '60840192000144',
    rg: '',
    orgEmis: '',
    emissaoRg: '',
    inscEstadual: '110940291',
    inscMunicipal: '840192',
    naturalidade: 'SÃO PAULO - SP',
    nascimento: '1998-03-12',
    sexo: 'N/A',
    regiao: 'Sudeste / Nacional',
    convenio: 'Contrato Anual CMP',
    classe: 'Fornecedor Principal',
    vendedor: 'Mariana Santos',
    status: 'Ativo',
    curva: 'Curva A (VIP)',
    limiteCredito: 250000.0,
    validadeLimite: '2028-12-31',
    classificacao: 'FORNECEDOR HOMOLOGADO A+',
    diaVencimento: 28,
    creditoUtilizado: 0.0,
    score: 950,
    ultimaCompra: '12/08/2026',
    diasAntes: 10,
    emailPrincipal: 'vendas@tintasbrasil.com.br',
    emailFinanceiro: 'nfe@tintasbrasil.com.br',
    site: 'www.tintasbrasil.com.br',
    cep: '04500-000',
    municipio: 'SÃO PAULO',
    uf: 'SP',
    endereco: 'Av. das Nações Unidas',
    numero: '12901',
    bairro: 'Brooklin',
    complemento: 'Torre Oeste 14º Andar',
    foneRes: '(11) 3040-8000',
    celularWhats: '(11) 98800-4400',
    profissao: 'Indústria Química de Tintas e Vernizes',
    rendaMensalLiq: 5000000.0,
    localTrabalho: 'TINTAS BRASIL S.A.',
    enderecoComercial: '',
    foneComercial: '(11) 3040-8000',
    fax: '',
    tempoServicoMeses: 280,
    empregoAnterior: '',
    pai: '',
    mae: '',
    placaVeiculo: '',
    modeloVeiculo: '',
    anoVeiculo: '',
    tabelaPreco: 'Preço Direto Fábrica',
    condicaoPagto: '30/60/90 Dias',
    formaPagto: 'Boleto Bancário',
    bloquearInadimplente: false,
    observacoes: 'Fornecedor primário de resinas, verniz PU e diluentes automotivos.',
    substituto: 'SIM',
    dataCadastro: '2016-01-20',
  },
  {
    id: 'pes-004',
    codigo: '004',
    tipo: 'TRANSPORTADOR',
    tipoPessoa: 'JURÍDICA',
    nome: 'TRANSOESTE LOGÍSTICA E TRANSPORTES S.A.',
    nomeAbrev: 'TRANSOESTE',
    cpfCnpj: '04829104000155',
    rg: '',
    orgEmis: '',
    emissaoRg: '',
    inscEstadual: '289104821',
    inscMunicipal: '341600',
    naturalidade: 'DOURADOS - MS',
    nascimento: '2005-11-04',
    sexo: 'N/A',
    regiao: 'Centro-Oeste & Sul',
    convenio: 'Tabela de Frete Fracionado',
    classe: 'Transportador Homologado',
    vendedor: 'Carlos Piveta',
    status: 'Ativo',
    curva: 'Curva A (VIP)',
    limiteCredito: 85000.0,
    validadeLimite: '2027-06-30',
    classificacao: 'TRANSPORTADORA OFICIAL',
    diaVencimento: 20,
    creditoUtilizado: 12000.0,
    score: 880,
    ultimaCompra: '10/08/2026',
    diasAntes: 3,
    emailPrincipal: 'suprimentos@transoeste.com.br',
    emailFinanceiro: 'ct-e@transoeste.com.br',
    site: 'www.transoeste.com.br',
    cep: '79840-010',
    municipio: 'DOURADOS',
    uf: 'MS',
    endereco: 'Rodovia BR-163',
    numero: 'Km 260',
    bairro: 'Distrito Industrial',
    complemento: 'Pátio de Cargas 01',
    foneRes: '(67) 3416-7700',
    celularWhats: '(67) 99610-8822',
    profissao: 'Transporte Rodoviário de Cargas Fracionadas',
    rendaMensalLiq: 950000.0,
    localTrabalho: 'TRANSOESTE',
    enderecoComercial: '',
    foneComercial: '(67) 3416-7700',
    fax: '',
    tempoServicoMeses: 220,
    empregoAnterior: '',
    pai: '',
    mae: '',
    placaVeiculo: 'MS-8812',
    modeloVeiculo: 'Scania R450 Bitrem',
    anoVeiculo: '2022',
    tabelaPreco: 'Tabela Frotistas & Empresas',
    condicaoPagto: '30 Dias',
    formaPagto: 'Boleto Bancário',
    bloquearInadimplente: true,
    observacoes: 'Responsável pela logística das rotas Dourados, Campo Grande e Ponta Porã.',
    substituto: 'NÃO',
    dataCadastro: '2019-07-15',
  },
  {
    id: 'pes-005',
    codigo: '005',
    tipo: 'PRODUTOR',
    tipoPessoa: 'JURÍDICA',
    nome: 'AGROPECUÁRIA GUARANÍ LTDA ME',
    nomeAbrev: 'AGRO GUARANÍ',
    cpfCnpj: '11204982000133',
    rg: '',
    orgEmis: '',
    emissaoRg: '',
    inscEstadual: '283009182',
    inscMunicipal: '',
    naturalidade: 'PONTA PORÃ - MS',
    nascimento: '2012-09-10',
    sexo: 'N/A',
    regiao: 'Fronteira Sul',
    convenio: '',
    classe: 'Produtor Rural / Atacado',
    vendedor: 'Mariana Santos',
    status: 'Ativo',
    curva: 'Curva B',
    limiteCredito: 40000.0,
    validadeLimite: '2026-12-31',
    classificacao: 'PRODUTOR RURAL A',
    diaVencimento: 15,
    creditoUtilizado: 5400.0,
    score: 790,
    ultimaCompra: '02/08/2026',
    diasAntes: 5,
    emailPrincipal: 'vendas@agroguarani.com.br',
    emailFinanceiro: 'financeiro@agroguarani.com.br',
    site: '',
    cep: '79900-000',
    municipio: 'PONTA PORÃ',
    uf: 'MS',
    endereco: 'Rua Marechal Floriano',
    numero: '890',
    bairro: 'Centro',
    complemento: '',
    foneRes: '(67) 3431-4400',
    celularWhats: '(67) 99933-2211',
    profissao: 'Agropecuária e Grãos',
    rendaMensalLiq: 220000.0,
    localTrabalho: 'AGRO GUARANÍ',
    enderecoComercial: '',
    foneComercial: '(67) 3431-4400',
    fax: '',
    tempoServicoMeses: 140,
    empregoAnterior: '',
    pai: '',
    mae: '',
    placaVeiculo: '',
    modeloVeiculo: '',
    anoVeiculo: '',
    tabelaPreco: 'Tabela Atacado Padrão',
    condicaoPagto: '30/60 Dias',
    formaPagto: 'Boleto Bancário',
    bloquearInadimplente: true,
    observacoes: '',
    substituto: 'NÃO',
    dataCadastro: '2021-03-12',
  },
  {
    id: 'pes-006',
    codigo: '006',
    tipo: 'REVENDEDOR',
    tipoPessoa: 'JURÍDICA',
    nome: 'TINTAS & CIA MS LTDA',
    nomeAbrev: 'TINTAS & CIA',
    cpfCnpj: '33491029000188',
    rg: '',
    orgEmis: '',
    emissaoRg: '',
    inscEstadual: '284910291',
    inscMunicipal: '',
    naturalidade: 'DOURADOS - MS',
    nascimento: '2019-06-25',
    sexo: 'N/A',
    regiao: 'Grande Dourados',
    convenio: '',
    classe: 'Revenda / Lojista',
    vendedor: 'Roberto Silva',
    status: 'Ativo',
    curva: 'Curva B',
    limiteCredito: 30000.0,
    validadeLimite: '2026-12-31',
    classificacao: 'REVENDA PARCEIRA',
    diaVencimento: 10,
    creditoUtilizado: 8900.0,
    score: 760,
    ultimaCompra: '28/07/2026',
    diasAntes: 5,
    emailPrincipal: 'gerencia@tintasecia.com.br',
    emailFinanceiro: 'contas@tintasecia.com.br',
    site: '',
    cep: '79820-000',
    municipio: 'DOURADOS',
    uf: 'MS',
    endereco: 'Rua Coronel Ponciano',
    numero: '1240',
    bairro: 'Vila Industrial',
    complemento: '',
    foneRes: '(67) 3423-1100',
    celularWhats: '(67) 99881-2299',
    profissao: 'Comércio Varejista de Tintas',
    rendaMensalLiq: 95000.0,
    localTrabalho: 'TINTAS & CIA',
    enderecoComercial: '',
    foneComercial: '(67) 3423-1100',
    fax: '',
    tempoServicoMeses: 70,
    empregoAnterior: '',
    pai: '',
    mae: '',
    placaVeiculo: '',
    modeloVeiculo: '',
    anoVeiculo: '',
    tabelaPreco: 'Tabela Atacado Padrão',
    condicaoPagto: '30 Dias',
    formaPagto: 'Boleto Bancário',
    bloquearInadimplente: true,
    observacoes: '',
    substituto: 'NÃO',
    dataCadastro: '2022-04-05',
  },
  {
    id: 'pes-007',
    codigo: '007',
    tipo: 'CLIENTE',
    tipoPessoa: 'JURÍDICA',
    nome: 'SUPERMERCADO PANTANAL LTDA',
    nomeAbrev: 'SUPER PANTANAL',
    cpfCnpj: '18492048000199',
    rg: '',
    orgEmis: '',
    emissaoRg: '',
    inscEstadual: '284001928',
    inscMunicipal: '184920',
    naturalidade: 'CAMPO GRANDE - MS',
    nascimento: '2008-07-14',
    sexo: 'N/A',
    regiao: 'Campo Grande e Região',
    convenio: 'Rede Varejo',
    classe: 'Supermercado / VIP',
    vendedor: 'Mariana Santos',
    status: 'Ativo',
    curva: 'Curva A (VIP)',
    limiteCredito: 120000.0,
    validadeLimite: '2028-12-31',
    classificacao: 'REDE VIP OURO',
    diaVencimento: 25,
    creditoUtilizado: 38900.0,
    score: 910,
    ultimaCompra: '05/08/2026',
    diasAntes: 5,
    emailPrincipal: 'compras@superpantanal.com.br',
    emailFinanceiro: 'contasapagar@superpantanal.com.br',
    site: 'www.superpantanal.com.br',
    cep: '79002-000',
    municipio: 'CAMPO GRANDE',
    uf: 'MS',
    endereco: 'Av. Afonso Pena',
    numero: '3100',
    bairro: 'Centro',
    complemento: 'Sede Administrativa',
    foneRes: '(67) 3388-1200',
    celularWhats: '(67) 99988-7766',
    profissao: 'Supermercados e Hipermercados',
    rendaMensalLiq: 1800000.0,
    localTrabalho: 'SUPER PANTANAL',
    enderecoComercial: '',
    foneComercial: '(67) 3388-1200',
    fax: '',
    tempoServicoMeses: 200,
    empregoAnterior: '',
    pai: '',
    mae: '',
    placaVeiculo: '',
    modeloVeiculo: '',
    anoVeiculo: '',
    tabelaPreco: 'Distribuidor VIP',
    condicaoPagto: '30/60/90 Dias',
    formaPagto: 'Boleto Bancário',
    bloquearInadimplente: false,
    observacoes: '',
    substituto: 'NÃO',
    dataCadastro: '2019-11-20',
  },
  {
    id: 'pes-008',
    codigo: '008',
    tipo: 'FUNCIONARIO',
    tipoPessoa: 'FÍSICA',
    nome: 'SILENUS DE SOUZA ROBERTO',
    nomeAbrev: 'SILENUS',
    cpfCnpj: '45089012044',
    rg: '1428901-SSP',
    orgEmis: 'SSP',
    emissaoRg: '2014-06-12',
    inscEstadual: '',
    inscMunicipal: '',
    naturalidade: 'DOURADOS - MS',
    nascimento: '1988-09-22',
    sexo: 'M',
    regiao: 'Matriz',
    convenio: 'Colaborador',
    classe: 'Suporte / Especialista ERP',
    vendedor: 'Carlos Piveta',
    status: 'Ativo',
    curva: 'Curva A (VIP)',
    limiteCredito: 10000.0,
    validadeLimite: '2028-12-31',
    classificacao: 'FUNCIONARIO COLABORADOR',
    diaVencimento: 5,
    creditoUtilizado: 0.0,
    score: 990,
    ultimaCompra: '14/08/2026',
    diasAntes: 0,
    emailPrincipal: 'silenus@coliseusistemas.com.br',
    emailFinanceiro: 'suporte@coliseusistemas.com.br',
    site: 'www.coliseusistemas.com.br',
    cep: '79800-010',
    municipio: 'DOURADOS',
    uf: 'MS',
    endereco: 'Rua João Rosa Góes',
    numero: '450',
    bairro: 'Jardim América',
    complemento: '',
    foneRes: '(67) 3421-0000',
    celularWhats: '(67) 99826-9796',
    profissao: 'Analista de Sistemas / Suporte ERP',
    rendaMensalLiq: 8500.0,
    localTrabalho: 'COLISEU SISTEMAS MATRIZ',
    enderecoComercial: 'Dourados - MS',
    foneComercial: '(67) 3421-9000',
    fax: '',
    tempoServicoMeses: 96,
    empregoAnterior: 'Tecnologia MS',
    pai: 'Roberto de Souza',
    mae: 'Maria Helena Souza',
    placaVeiculo: 'QAA-1988',
    modeloVeiculo: 'Toyota Corolla Cross',
    anoVeiculo: '2024',
    tabelaPreco: 'Tabela Funcionário',
    condicaoPagto: 'Folha de Pagamento',
    formaPagto: 'Desconto em Folha',
    bloquearInadimplente: false,
    observacoes: 'Usuário administrador e técnico da matriz com acesso global ao sistema.',
    substituto: 'NÃO',
    dataCadastro: '2016-08-14',
  },
];

import migratedPessoasData from '../data/migrated_pessoas.json';

export const PessoasPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPessoaId, setSelectedPessoaId] = useState<string>('pes-00001');
  const [selectedTipoFiltro, setSelectedTipoFiltro] = useState<string>('TODOS');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalTab, setModalTab] = useState<'principal' | 'pessoais' | 'outros' | 'comercial'>('principal');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isConsultingReceita, setIsConsultingReceita] = useState(false);
  const [isConsultingCep, setIsConsultingCep] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const carregarPessoasUnificadas = () => {
    try {
      const customRaw = localStorage.getItem('coliseu_custom_pessoas');
      const customList: PessoaUnificada[] = customRaw ? JSON.parse(customRaw) : [];
      const baseList: PessoaUnificada[] = Array.isArray(migratedPessoasData) ? (migratedPessoasData as any[]) : INITIAL_PESSOAS;

      const map = new Map<string, PessoaUnificada>();
      baseList.forEach((p) => {
        if (p && p.id) {
          map.set(p.id, {
            ...p,
            tipo: p.tipo || 'CLIENTE',
            nome: p.nome || '',
            nomeAbrev: p.nomeAbrev || p.nome || '',
            status: p.status || 'Ativo',
          });
        }
      });
      customList.forEach((p) => {
        if (p && p.id) {
          map.set(p.id, {
            ...p,
            tipo: p.tipo || 'CLIENTE',
            nome: p.nome || '',
            nomeAbrev: p.nomeAbrev || p.nome || '',
            status: p.status || 'Ativo',
          });
        }
      });

      const all = Array.from(map.values());
      const customIds = new Set(customList.map((c) => c.id));
      const customOnTop = all.filter((p) => customIds.has(p.id));
      const baseRemaining = all.filter((p) => !customIds.has(p.id));

      return [...customOnTop, ...baseRemaining];
    } catch {
      return INITIAL_PESSOAS;
    }
  };

  const [pessoas, setPessoas] = useState<PessoaUnificada[]>(carregarPessoasUnificadas);

  useEffect(() => {
    // 1. Escuta eventos em tempo real do barramento Omni-Sync (SSE)
    const handleSyncUpdate = () => {
      setPessoas(carregarPessoasUnificadas());
    };
    window.addEventListener('coliseu_pessoas_updated', handleSyncUpdate);

    // 2. Carga inicial e sincronização de novos cadastros com a Nuvem (PostgreSQL Central)
    const loadCloudData = async () => {
      try {
        const customRaw = localStorage.getItem('coliseu_custom_pessoas');
        const customList: PessoaUnificada[] = customRaw ? JSON.parse(customRaw) : [];
        
        // Se houver cadastros criados localmente, envia para a nuvem
        if (customList.length > 0) {
          syncService.syncBatchPessoas(customList).catch(() => {});
        }

        const cloudPessoas = await syncService.fetchCloudPessoas();
        if (Array.isArray(cloudPessoas) && cloudPessoas.length > 0) {
          let updatedCustom = [...customList];
          cloudPessoas.forEach((cp: any) => {
            const idx = updatedCustom.findIndex((item) => item.id === cp.id);
            if (idx >= 0) {
              updatedCustom[idx] = { ...updatedCustom[idx], ...cp };
            } else {
              updatedCustom = [cp, ...updatedCustom];
            }
          });

          localStorage.setItem('coliseu_custom_pessoas', JSON.stringify(updatedCustom));
          setPessoas(carregarPessoasUnificadas());
        }
      } catch (err) {
        console.warn('[Pessoas] Falha ao carregar pessoas da nuvem:', err);
      }
    };
    loadCloudData();

    return () => {
      window.removeEventListener('coliseu_pessoas_updated', handleSyncUpdate);
    };
  }, []);

  // Form State Completo
  const [formId, setFormId] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formTipo, setFormTipo] = useState<TipoParceiro>('CLIENTE');
  const [formTipoPessoa, setFormTipoPessoa] = useState<'FÍSICA' | 'JURÍDICA'>('JURÍDICA');
  const [formNome, setFormNome] = useState('');
  const [formNomeAbrev, setFormNomeAbrev] = useState('');
  const [formCpfCnpj, setFormCpfCnpj] = useState('');
  const [formPermitirDocLivre, setFormPermitirDocLivre] = useState(false);
  const [formRg, setFormRg] = useState('');
  const [formOrgEmis, setFormOrgEmis] = useState('SSP');
  const [formEmissaoRg, setFormEmissaoRg] = useState('');
  const [formInscEstadual, setFormInscEstadual] = useState('');
  const [formInscMunicipal, setFormInscMunicipal] = useState('');
  const [formNaturalidade, setFormNaturalidade] = useState('DOURADOS - MS');
  const [formNascimento, setFormNascimento] = useState('');
  const [formSexo, setFormSexo] = useState<'M' | 'F' | 'N/A'>('N/A');
  const [formRegiao, setFormRegiao] = useState('Grande Dourados');
  const [formConvenio, setFormConvenio] = useState('');
  const [formClasse, setFormClasse] = useState('Atacado / Distribuidor');
  const [formVendedor, setFormVendedor] = useState('Roberto Silva');
  const [formStatus, setFormStatus] = useState<'Ativo' | 'Bloqueado' | 'Em Análise'>('Ativo');
  const [formCurva, setFormCurva] = useState<'Curva A (VIP)' | 'Curva B' | 'Curva C'>('Curva A (VIP)');

  // Crédito
  const [formLimiteCredito, setFormLimiteCredito] = useState('30000.00');
  const [formValidadeLimite, setFormValidadeLimite] = useState('2027-12-31');
  const [formClassificacao, setFormClassificacao] = useState('CLIENTE PADRÃO');
  const [formDiaVencimento, setFormDiaVencimento] = useState(15);
  const [formScore, setFormScore] = useState(800);
  const [formUltimaCompra, setFormUltimaCompra] = useState('');
  const [formDiasAntes, setFormDiasAntes] = useState(5);

  // Informações Digitais
  const [formEmailPrincipal, setFormEmailPrincipal] = useState('');
  const [formEmailFinanceiro, setFormEmailFinanceiro] = useState('');
  const [formSite, setFormSite] = useState('');

  // Endereço Residencial / Comercial
  const [formCep, setFormCep] = useState('79800-000');
  const [formMunicipio, setFormMunicipio] = useState('DOURADOS');
  const [formUf, setFormUf] = useState('MS');
  const [formEndereco, setFormEndereco] = useState('');
  const [formNumero, setFormNumero] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formComplemento, setFormComplemento] = useState('');
  const [formFoneRes, setFormFoneRes] = useState('(67) ');
  const [formCelularWhats, setFormCelularWhats] = useState('(67) 9');

  // Profissionais & Filiação
  const [formProfissao, setFormProfissao] = useState('');
  const [formRendaMensalLiq, setFormRendaMensalLiq] = useState('0.00');
  const [formLocalTrabalho, setFormLocalTrabalho] = useState('');
  const [formEnderecoComercial, setFormEnderecoComercial] = useState('');
  const [formFoneComercial, setFormFoneComercial] = useState('');
  const [formFax, setFormFax] = useState('');
  const [formTempoServicoMeses, setFormTempoServicoMeses] = useState(12);
  const [formEmpregoAnterior, setFormEmpregoAnterior] = useState('');
  const [formPai, setFormPai] = useState('');
  const [formMae, setFormMae] = useState('');

  // Veículos & Parâmetros
  const [formPlacaVeiculo, setFormPlacaVeiculo] = useState('');
  const [formModeloVeiculo, setFormModeloVeiculo] = useState('');
  const [formAnoVeiculo, setFormAnoVeiculo] = useState('');
  const [formTabelaPreco, setFormTabelaPreco] = useState('Tabela Atacado Padrão');
  const [formCondicaoPagto, setFormCondicaoPagto] = useState('30/60 Dias');
  const [formFormaPagto, setFormFormaPagto] = useState('Boleto Bancário');
  const [formBloquearInadimplente, setFormBloquearInadimplente] = useState(true);
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formSubstituto, setFormSubstituto] = useState('NÃO');
  const [formDataCadastro, setFormDataCadastro] = useState(new Date().toISOString().split('T')[0]);

  // Escape key listener for modal
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // CONSULTA AUTOMÁTICA DA RECEITA FEDERAL VIA CNPJ (Botão C da tela Coliseu)
  const handleConsultarReceitaCnpj = async () => {
    const cleanCnpj = formCpfCnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      showToast('⚠️ Informe um CNPJ válido com 14 dígitos para consultar na Receita.');
      return;
    }

    setIsConsultingReceita(true);
    showToast('🔍 Consultando dados na Receita Federal / RFB...');

    try {
      const data = await pessoasService.consultarCnpjGratuito(cleanCnpj);
      if (data && data.razao_social) {
        setFormNome(data.razao_social.toUpperCase());
        setFormNomeAbrev((data.nome_fantasia || data.razao_social).toUpperCase());
        if (data.cep) setFormCep(data.cep);
        if (data.logradouro) setFormEndereco(data.logradouro);
        if (data.numero) setFormNumero(data.numero);
        if (data.complemento) setFormComplemento(data.complemento);
        if (data.bairro) setFormBairro(data.bairro);
        if (data.municipio) setFormMunicipio(data.municipio.toUpperCase());
        if (data.uf) setFormUf(data.uf.toUpperCase());
        if (data.cnae_fiscal_descricao) setFormProfissao(data.cnae_fiscal_descricao);
        setFormTipoPessoa('JURÍDICA');
        showToast(`✅ CNPJ '${data.razao_social}' importado com sucesso da Receita Federal!`);
      } else {
        showToast('⚠️ CNPJ não localizado ou serviço da Receita temporariamente instável.');
      }
    } catch (err: any) {
      showToast('❌ Falha ao conectar ao serviço de consulta da Receita Federal.');
    } finally {
      setIsConsultingReceita(false);
    }
  };

  // CONSULTA AUTOMÁTICA DE ENDEREÇO VIA CEP (Botão ... do CEP)
  const handleConsultarCep = async () => {
    const cleanCep = formCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      showToast('⚠️ Informe um CEP válido com 8 dígitos.');
      return;
    }

    setIsConsultingCep(true);
    try {
      const data = await pessoasService.consultarCepGratuito(cleanCep);
      if (data && !data.erro) {
        if (data.logradouro) setFormEndereco(data.logradouro);
        if (data.bairro) setFormBairro(data.bairro);
        if (data.localidade) setFormMunicipio(data.localidade.toUpperCase());
        if (data.uf) setFormUf(data.uf.toUpperCase());
        showToast(`✅ Endereço preenchido: ${data.localidade}/${data.uf}!`);
      } else {
        showToast('⚠️ CEP não encontrado.');
      }
    } catch {
      showToast('❌ Erro ao consultar CEP.');
    } finally {
      setIsConsultingCep(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setModalTab('principal');
    const proximoCodigo = (pessoas.length + 1).toString().padStart(3, '0');
    setFormId(`pes-${Date.now()}`);
    setFormCodigo(proximoCodigo);
    setFormTipo('CLIENTE');
    setFormTipoPessoa('JURÍDICA');
    setFormNome('');
    setFormNomeAbrev('');
    setFormCpfCnpj('');
    setFormPermitirDocLivre(false);
    setFormRg('');
    setFormOrgEmis('SSP');
    setFormEmissaoRg('');
    setFormInscEstadual('');
    setFormInscMunicipal('');
    setFormNaturalidade('DOURADOS - MS');
    setFormNascimento('');
    setFormSexo('N/A');
    setFormRegiao('Grande Dourados');
    setFormConvenio('');
    setFormClasse('Atacado / Distribuidor');
    setFormVendedor('Roberto Silva');
    setFormStatus('Ativo');
    setFormCurva('Curva A (VIP)');
    setFormLimiteCredito('30000.00');
    setFormValidadeLimite('2027-12-31');
    setFormClassificacao('CLIENTE PADRÃO');
    setFormDiaVencimento(15);
    setFormScore(800);
    setFormUltimaCompra('');
    setFormDiasAntes(5);
    setFormEmailPrincipal('');
    setFormEmailFinanceiro('');
    setFormSite('');
    setFormCep('79800-000');
    setFormMunicipio('DOURADOS');
    setFormUf('MS');
    setFormEndereco('');
    setFormNumero('');
    setFormBairro('');
    setFormComplemento('');
    setFormFoneRes('(67) ');
    setFormCelularWhats('(67) 9');
    setFormProfissao('');
    setFormRendaMensalLiq('0.00');
    setFormLocalTrabalho('');
    setFormEnderecoComercial('');
    setFormFoneComercial('');
    setFormFax('');
    setFormTempoServicoMeses(12);
    setFormEmpregoAnterior('');
    setFormPai('');
    setFormMae('');
    setFormPlacaVeiculo('');
    setFormModeloVeiculo('');
    setFormAnoVeiculo('');
    setFormTabelaPreco('Tabela Atacado Padrão');
    setFormCondicaoPagto('30/60 Dias');
    setFormFormaPagto('Boleto Bancário');
    setFormBloquearInadimplente(true);
    setFormObservacoes('');
    setFormSubstituto('NÃO');
    setFormDataCadastro(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: PessoaUnificada) => {
    setModalMode('edit');
    setModalTab('principal');
    setFormId(p.id);
    setFormCodigo(p.codigo || '001');
    setFormTipo(p.tipo || 'CLIENTE');
    setFormTipoPessoa(p.tipoPessoa || 'JURÍDICA');
    setFormNome(p.nome || '');
    setFormNomeAbrev(p.nomeAbrev || '');
    setFormCpfCnpj(p.cpfCnpj || '');
    const docOk = validarCpfCnpj(p.cpfCnpj, p.tipoPessoa || 'JURÍDICA');
    setFormPermitirDocLivre(!docOk && !!p.cpfCnpj);
    setFormRg(p.rg || '');
    setFormOrgEmis(p.orgEmis || 'SSP');
    setFormEmissaoRg(p.emissaoRg || '');
    setFormInscEstadual(p.inscEstadual || '');
    setFormInscMunicipal(p.inscMunicipal || '');
    setFormNaturalidade(p.naturalidade || 'DOURADOS - MS');
    setFormNascimento(p.nascimento || '');
    setFormSexo(p.sexo || 'N/A');
    setFormRegiao(p.regiao || 'Grande Dourados');
    setFormConvenio(p.convenio || '');
    setFormClasse(p.classe || 'Atacado');
    setFormVendedor(p.vendedor || 'Roberto Silva');
    setFormStatus(p.status || 'Ativo');
    setFormCurva(p.curva || 'Curva A (VIP)');
    setFormLimiteCredito((p.limiteCredito || 0).toString());
    setFormValidadeLimite(p.validadeLimite || '2027-12-31');
    setFormClassificacao(p.classificacao || 'CLIENTE PADRÃO');
    setFormDiaVencimento(p.diaVencimento || 15);
    setFormScore(p.score || 800);
    setFormUltimaCompra(p.ultimaCompra || '');
    setFormDiasAntes(p.diasAntes || 5);
    setFormEmailPrincipal(p.emailPrincipal || '');
    setFormEmailFinanceiro(p.emailFinanceiro || '');
    setFormSite(p.site || '');
    setFormCep(p.cep || '79800-000');
    setFormMunicipio(p.municipio || 'DOURADOS');
    setFormUf(p.uf || 'MS');
    setFormEndereco(p.endereco || '');
    setFormNumero(p.numero || '');
    setFormBairro(p.bairro || '');
    setFormComplemento(p.complemento || '');
    setFormFoneRes(p.foneRes || '');
    setFormCelularWhats(p.celularWhats || '');
    setFormProfissao(p.profissao || '');
    setFormRendaMensalLiq((p.rendaMensalLiq || 0).toString());
    setFormLocalTrabalho(p.localTrabalho || '');
    setFormEnderecoComercial(p.enderecoComercial || '');
    setFormFoneComercial(p.foneComercial || '');
    setFormFax(p.fax || '');
    setFormTempoServicoMeses(p.tempoServicoMeses || 12);
    setFormEmpregoAnterior(p.empregoAnterior || '');
    setFormPai(p.pai || '');
    setFormMae(p.mae || '');
    setFormPlacaVeiculo(p.placaVeiculo || '');
    setFormModeloVeiculo(p.modeloVeiculo || '');
    setFormAnoVeiculo(p.anoVeiculo || '');
    setFormTabelaPreco(p.tabelaPreco || 'Tabela Atacado Padrão');
    setFormCondicaoPagto(p.condicaoPagto || '30/60 Dias');
    setFormFormaPagto(p.formaPagto || 'Boleto Bancário');
    setFormBloquearInadimplente(p.bloquearInadimplente ?? true);
    setFormObservacoes(p.observacoes || '');
    setFormSubstituto(p.substituto || 'NÃO');
    setFormDataCadastro(p.dataCadastro || new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSalvarPessoa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formCpfCnpj.trim()) {
      showToast('⚠️ Preencha os campos obrigatórios: Nome/Razão Social e CPF/CNPJ.');
      return;
    }

    // Validação Fiscal Brasileira Oficial (Receita Federal)
    if (!formPermitirDocLivre) {
      const isValido = validarCpfCnpj(formCpfCnpj, formTipoPessoa);
      if (!isValido) {
        showToast(
          `⚠️ O ${formTipoPessoa === 'JURÍDICA' ? 'CNPJ' : 'CPF'} informado (${formCpfCnpj}) é inválido perante as regras da Receita Federal. Corrija os dígitos ou marque a opção 'Permitir qualquer número'.`
        );
        return;
      }
    }

    const limVal = parseNumber(formLimiteCredito);
    const rendVal = parseNumber(formRendaMensalLiq);

    const dados: PessoaUnificada = {
      id: formId,
      codigo: formCodigo,
      tipo: formTipo,
      tipoPessoa: formTipoPessoa,
      nome: formNome.toUpperCase().trim(),
      nomeAbrev: formNomeAbrev.toUpperCase().trim() || formNome.toUpperCase().trim(),
      cpfCnpj: formCpfCnpj.trim(),
      rg: formRg.trim(),
      orgEmis: formOrgEmis.trim(),
      emissaoRg: formEmissaoRg.trim(),
      inscEstadual: formInscEstadual.trim(),
      inscMunicipal: formInscMunicipal.trim(),
      naturalidade: formNaturalidade.trim(),
      nascimento: formNascimento.trim(),
      sexo: formSexo,
      regiao: formRegiao.trim(),
      convenio: formConvenio.trim(),
      classe: formClasse.trim(),
      vendedor: formVendedor,
      status: formStatus,
      curva: formCurva,
      limiteCredito: isNaN(limVal) ? 15000.0 : limVal,
      validadeLimite: formValidadeLimite,
      classificacao: formClassificacao,
      diaVencimento: formDiaVencimento,
      creditoUtilizado: modalMode === 'edit' ? (pessoas.find((p) => p.id === formId)?.creditoUtilizado || 0) : 0.0,
      score: formScore,
      ultimaCompra: formUltimaCompra || new Date().toLocaleDateString('pt-BR'),
      diasAntes: formDiasAntes,
      emailPrincipal: formEmailPrincipal.trim().toLowerCase(),
      emailFinanceiro: formEmailFinanceiro.trim().toLowerCase(),
      site: formSite.trim(),
      cep: formCep.trim(),
      municipio: formMunicipio.toUpperCase().trim(),
      uf: formUf.toUpperCase().trim(),
      endereco: formEndereco.trim(),
      numero: formNumero.trim(),
      bairro: formBairro.trim(),
      complemento: formComplemento.trim(),
      foneRes: formFoneRes.trim(),
      celularWhats: formCelularWhats.trim(),
      profissao: formProfissao.trim(),
      rendaMensalLiq: isNaN(rendVal) ? 0.0 : rendVal,
      localTrabalho: formLocalTrabalho.trim(),
      enderecoComercial: formEnderecoComercial.trim(),
      foneComercial: formFoneComercial.trim(),
      fax: formFax.trim(),
      tempoServicoMeses: formTempoServicoMeses,
      empregoAnterior: formEmpregoAnterior.trim(),
      pai: formPai.trim(),
      mae: formMae.trim(),
      placaVeiculo: formPlacaVeiculo.trim(),
      modeloVeiculo: formModeloVeiculo.trim(),
      anoVeiculo: formAnoVeiculo.trim(),
      tabelaPreco: formTabelaPreco,
      condicaoPagto: formCondicaoPagto,
      formaPagto: formFormaPagto,
      bloquearInadimplente: formBloquearInadimplente,
      observacoes: formObservacoes.trim(),
      substituto: formSubstituto,
      dataCadastro: formDataCadastro,
    };

    // Grava no cache local de novos cadastros / edições
    const customRaw = localStorage.getItem('coliseu_custom_pessoas');
    let customList: PessoaUnificada[] = customRaw ? JSON.parse(customRaw) : [];
    const idx = customList.findIndex((p) => p.id === dados.id);
    if (idx >= 0) {
      customList[idx] = dados;
    } else {
      customList = [dados, ...customList];
    }
    localStorage.setItem('coliseu_custom_pessoas', JSON.stringify(customList));

    // Atualiza estado reativo da tela
    setPessoas(carregarPessoasUnificadas());
    setSelectedPessoaId(dados.id);

    // Dispara sincronização em tempo real para a VPS (PostgreSQL Central)
    syncService.syncPessoa(dados).catch(() => {});

    if (modalMode === 'create') {
      showToast(`✅ ${dados.tipo} '${dados.nome}' cadastrado e sincronizado!`);
    } else {
      showToast(`✅ Cadastro de '${dados.nome}' atualizado e sincronizado!`);
    }

    setIsModalOpen(false);
  };

  const handleExcluirPessoa = (id: string) => {
    const target = pessoas.find((p) => p.id === id);
    if (!target) return;
    if (pessoas.length <= 1) {
      showToast('⚠️ O sistema deve manter ao menos um registro cadastrado.');
      return;
    }

    const customRaw = localStorage.getItem('coliseu_custom_pessoas');
    let customList: PessoaUnificada[] = customRaw ? JSON.parse(customRaw) : [];
    customList = customList.filter((p) => p.id !== id);
    localStorage.setItem('coliseu_custom_pessoas', JSON.stringify(customList));

    setPessoas(carregarPessoasUnificadas());
    setSelectedPessoaId(pessoas.find((p) => p.id !== id)?.id || '');
    syncService.deletePessoa(id).catch(() => {});
    showToast(`🗑️ ${target.tipo} '${target.nome}' removido.`);
  };

  // Filtragem Unificada por Tipo e Busca (100% Protegida contra campos nulos)
  const filteredPessoas = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (pessoas || []).filter((p) => {
      if (!p) return false;
      const tipo = String(p.tipo || 'CLIENTE').toUpperCase();
      const status = String(p.status || 'Ativo');

      // Filtro por Tipo de Cadastro
      if (selectedTipoFiltro === 'CLIENTES' && !tipo.includes('CLIENTE')) return false;
      if (selectedTipoFiltro === 'FORNECEDORES' && !tipo.includes('FORNECEDOR')) return false;
      if (selectedTipoFiltro === 'TRANSPORTADORES' && tipo !== 'TRANSPORTADOR') return false;
      if (selectedTipoFiltro === 'PRODUTORES_REV' && tipo !== 'PRODUTOR' && tipo !== 'REVENDEDOR') return false;
      if (selectedTipoFiltro === 'FUNCIONARIOS' && tipo !== 'FUNCIONARIO') return false;

      // Filtro de Status
      if (filterActiveOnly && status !== 'Ativo') return false;

      // Busca Textual
      if (!q) return true;
      const nome = String(p.nome || '').toLowerCase();
      const nomeAbrev = String(p.nomeAbrev || '').toLowerCase();
      const cpfCnpj = String(p.cpfCnpj || '');
      const codigo = String(p.codigo || '');
      const municipio = String(p.municipio || '').toLowerCase();

      return (
        nome.includes(q) ||
        nomeAbrev.includes(q) ||
        cpfCnpj.includes(q) ||
        codigo.includes(q) ||
        municipio.includes(q) ||
        tipo.toLowerCase().includes(q)
      );
    });
  }, [pessoas, searchTerm, selectedTipoFiltro, filterActiveOnly]);

  const activePessoa = (pessoas || []).find((p) => p.id === selectedPessoaId) || pessoas[0] || INITIAL_PESSOAS[0];

  // Métricas Consolidadas
  const totalCount = (pessoas || []).length;
  const clientesCount = (pessoas || []).filter((p) => String(p.tipo || '').includes('CLIENTE')).length;
  const fornecedoresCount = (pessoas || []).filter((p) => String(p.tipo || '').includes('FORNECEDOR')).length;
  const transportadoresCount = (pessoas || []).filter((p) => String(p.tipo || '') === 'TRANSPORTADOR').length;
  const limiteTotal = (pessoas || []).reduce((acc, p) => acc + (p.limiteCredito || 0), 0);

  return (
    <div className="coliseu-page" style={{ height: 'calc(100vh - var(--header-height))', overflow: 'hidden', padding: 'var(--spacing-3) var(--spacing-4)', gap: 'var(--spacing-3)' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <Check size={16} style={{ color: 'var(--status-success)', flexShrink: 0 }} aria-hidden="true" />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
              {toastMessage}
            </span>
          </div>
        </div>
      )}

      {/* Header do Módulo Unificado */}
      <PageHeader
        title="Cadastro de Clientes & Fornecedores (Unificado)"
        description="Cadastro completo do cliente e do fornecedor, contendo informações de limite automático, classificação, bens e referências."
        breadcrumbItems={[
          { label: 'Cadastros', active: false },
          { label: 'Clientes & Fornecedores', active: true },
        ]}
        primaryAction={{
          label: 'Novo Cadastro (F3)',
          onClick: handleOpenCreateModal,
          icon: <Plus size={14} />,
        }}
      />

      {/* Barra de Métricas Rápidas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--spacing-3)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px var(--spacing-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface-2)', color: 'var(--domain-comercial)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={15} />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cadastros Totais</span>
            <div className="tabular-nums" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{totalCount} Registros</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface-2)', color: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={15} />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clientes na Base</span>
            <div className="tabular-nums" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{clientesCount} Clientes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface-2)', color: 'var(--domain-compras)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={15} />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fornecedores & Transp.</span>
            <div className="tabular-nums" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {fornecedoresCount} Forn. • {transportadoresCount} Transp.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface-2)', color: 'var(--action-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={15} />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Limite Global Concedido</span>
            <div className="tabular-nums" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(limiteTotal)}</div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Split-View 4:8 (Prioridade ampla para os títulos e dados do cliente na direita) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(320px, 4fr) minmax(640px, 8fr)', gap: 'var(--spacing-3)', overflow: 'hidden' }}>
        {/* Tabela de Clientes & Fornecedores */}
        <div
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%',
            padding: 'var(--spacing-3)',
            gap: 'var(--spacing-2)',
          }}
        >
          {/* Barra de Filtro de Tipo Unificado (Tabs rápidas) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'CLIENTES', label: 'Clientes' },
                { id: 'FORNECEDORES', label: 'Fornecedores' },
                { id: 'TRANSPORTADORES', label: 'Transportadores' },
                { id: 'PRODUTORES_REV', label: 'Produtores/Rev.' },
                { id: 'FUNCIONARIOS', label: 'Funcionários' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTipoFiltro(tab.id)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '11px',
                    fontWeight: selectedTipoFiltro === tab.id ? 600 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedTipoFiltro === tab.id ? 'var(--action-primary)' : 'transparent',
                    color: selectedTipoFiltro === tab.id ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all var(--motion-fast) var(--motion-ease)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFilterActiveOnly(!filterActiveOnly)}
              style={{
                backgroundColor: filterActiveOnly ? 'var(--status-success-bg)' : 'var(--surface-2)',
                color: filterActiveOnly ? 'var(--status-success)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: '2px 8px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {filterActiveOnly ? '● Somente Ativos' : '○ Todos Status'}
            </button>
          </div>

          {/* Campo de Busca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder="Buscar por Nome, Fantasia, CNPJ, Código ou Cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search size={13} />}
              />
            </div>
          </div>

          {/* Container da Tabela com Scroll */}
          <div className="coliseu-table-container" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="coliseu-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>Cód</th>
                  <th>Razão Social / Fantasia</th>
                  <th>Tipo</th>
                  <th>CNPJ / CPF</th>
                  <th>Cidade/UF</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPessoas
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((p) => {
                    const isSelected = p.id === selectedPessoaId;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPessoaId(p.id)}
                        aria-selected={isSelected}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--surface-selected)' : undefined,
                        }}
                      >
                        <td className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {p.codigo}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'var(--font-weight-medium)', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {p.nome}
                            </span>
                            {p.nomeAbrev && p.nomeAbrev !== p.nome && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {p.nomeAbrev}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-xs)',
                              backgroundColor: String(p.tipo || '').includes('FORNECEDOR')
                                ? 'var(--status-warning-bg)'
                                : p.tipo === 'TRANSPORTADOR'
                                ? 'var(--domain-compras)'
                                : 'var(--surface-2)',
                              color: String(p.tipo || '').includes('FORNECEDOR')
                                ? 'var(--status-warning)'
                                : 'var(--text-primary)',
                            }}
                          >
                            {p.tipo || 'CLIENTE'}
                          </span>
                        </td>
                        <td className="text-mono" style={{ color: 'var(--text-link)', fontSize: '11px' }}>
                          {formatCnpjCpf(p.cpfCnpj)}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          {p.municipio}/{p.uf}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Rodapé da Tabela com Paginação Ativa */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
            <span>
              Mostrando <strong>{Math.min(filteredPessoas.length, (currentPage - 1) * pageSize + 1)}</strong>-
              <strong>{Math.min(filteredPessoas.length, currentPage * pageSize)}</strong> de <strong>{filteredPessoas.length}</strong> cadastros
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={13} />
              </Button>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentPage} de {Math.max(1, Math.ceil(filteredPessoas.length / pageSize))}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= Math.ceil(filteredPessoas.length / pageSize)}
                onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredPessoas.length / pageSize), p + 1))}
              >
                <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        </div>

        {/* Customer / Partner Workspace 360° */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <CustomerCommandCenter360
            cliente={activePessoa}
            onEditClient={(c) => handleOpenEditModal(c)}
          />
        </div>
      </div>

      {/* Modal Cadastro de Clientes & Fornecedores Completo */}
      {isModalOpen && (
        <div className="coliseu-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="coliseu-modal coliseu-modal--xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              width: '960px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-2xl)',
            }}
          >
            {/* Header com Identidade Clássica Coliseu */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '14px',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} style={{ color: 'var(--action-primary)' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {modalMode === 'create' ? 'Novo Cadastro de Parceiro (Cliente / Fornecedor)' : `Editar Cadastro — ${formNome || 'Parceiro'}`}
                  </h3>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  Cadastro completo do cliente e do fornecedor, contendo informações de limite automático, classificação, bens e referências.
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                aria-label="Fechar Modal"
                style={{ padding: '6px', height: '32px', width: '32px' }}
              >
                <X size={16} />
              </Button>
            </div>

            {/* Abas Superiores Idênticas à Tela Clássica */}
            <div className="coliseu-tabs" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setModalTab('principal')}
                className={`coliseu-tab ${modalTab === 'principal' ? 'coliseu-tab--active' : ''}`}
                style={{ padding: '10px 16px', fontSize: '12px', fontWeight: modalTab === 'principal' ? 700 : 500 }}
              >
                📁 Principal
              </button>
              <button
                type="button"
                onClick={() => setModalTab('pessoais')}
                className={`coliseu-tab ${modalTab === 'pessoais' ? 'coliseu-tab--active' : ''}`}
                style={{ padding: '10px 16px', fontSize: '12px', fontWeight: modalTab === 'pessoais' ? 700 : 500 }}
              >
                📝 Dados Pessoais & Endereço
              </button>
              <button
                type="button"
                onClick={() => setModalTab('comercial')}
                className={`coliseu-tab ${modalTab === 'comercial' ? 'coliseu-tab--active' : ''}`}
                style={{ padding: '10px 16px', fontSize: '12px', fontWeight: modalTab === 'comercial' ? 700 : 500 }}
              >
                💳 Crédito & Informações Digitais
              </button>
              <button
                type="button"
                onClick={() => setModalTab('outros')}
                className={`coliseu-tab ${modalTab === 'outros' ? 'coliseu-tab--active' : ''}`}
                style={{ padding: '10px 16px', fontSize: '12px', fontWeight: modalTab === 'outros' ? 700 : 500 }}
              >
                🚗 Veículos & Outros
              </button>
            </div>

            <form onSubmit={handleSalvarPessoa} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: '4px', gap: '14px' }}>
              {/* ABA 1: PRINCIPAL */}
              {modalTab === 'principal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Linha 1: Código, Tipo de Parceiro, Pessoa F/J, CPF/CNPJ com Botão 'C' de Consulta Receita */}
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 200px 150px 1fr', gap: '14px', alignItems: 'flex-end' }}>
                    <div>
                      <label className="coliseu-label">Código</label>
                      <input type="text" value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} className="coliseu-input text-mono" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label">Tipo de Cadastro *</label>
                      <select value={formTipo} onChange={(e) => setFormTipo(e.target.value as any)} className="coliseu-select" style={{ fontWeight: 600, height: '38px' }}>
                        <option value="CLIENTE">CLIENTE</option>
                        <option value="FORNECEDOR">FORNECEDOR</option>
                        <option value="PRODUTOR">PRODUTOR</option>
                        <option value="REVENDEDOR">REVENDEDOR</option>
                        <option value="FUNCIONARIO">FUNCIONARIO</option>
                        <option value="PORTADOR">PORTADOR</option>
                        <option value="TRANSPORTADOR">TRANSPORTADOR</option>
                        <option value="CLIENTE & FORNECEDOR">CLIENTE & FORNECEDOR</option>
                      </select>
                    </div>
                    <div>
                      <label className="coliseu-label">Pessoa</label>
                      <select value={formTipoPessoa} onChange={(e) => setFormTipoPessoa(e.target.value as any)} className="coliseu-select" style={{ height: '38px' }}>
                        <option value="JURÍDICA">JURÍDICA (CNPJ)</option>
                        <option value="FÍSICA">FÍSICA (CPF)</option>
                      </select>
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>{formTipoPessoa === 'JURÍDICA' ? 'CNPJ *' : 'CPF *'}</span>
                        {formTipoPessoa === 'JURÍDICA' && !formPermitirDocLivre && (
                          <span style={{ fontSize: '11px', color: 'var(--action-primary)', fontWeight: 600 }}>
                            Consulta Automática RFB
                          </span>
                        )}
                        {!formPermitirDocLivre && (formTipoPessoa === 'JURÍDICA' ? formCpfCnpj.replace(/\D/g, '').length === 14 : formCpfCnpj.replace(/\D/g, '').length === 11) && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: validarCpfCnpj(formCpfCnpj, formTipoPessoa) ? 'var(--status-success)' : 'var(--status-danger)' }}>
                            {validarCpfCnpj(formCpfCnpj, formTipoPessoa) ? '✅ Válido' : '❌ Inválido (Dígitos Incorretos)'}
                          </span>
                        )}
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          required
                          placeholder={
                            formPermitirDocLivre
                              ? 'Qualquer número / Isento'
                              : formTipoPessoa === 'JURÍDICA'
                              ? '00.000.000/0000-00'
                              : '000.000.000-00'
                          }
                          value={formCpfCnpj}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (formPermitirDocLivre) {
                              setFormCpfCnpj(val);
                            } else {
                              setFormCpfCnpj(maskCpfCnpj(val, formTipoPessoa));
                            }
                          }}
                          className="coliseu-input text-mono"
                          style={{
                            flex: 1,
                            height: '38px',
                            borderColor:
                              !formPermitirDocLivre && (formTipoPessoa === 'JURÍDICA' ? formCpfCnpj.replace(/\D/g, '').length === 14 : formCpfCnpj.replace(/\D/g, '').length === 11)
                                ? validarCpfCnpj(formCpfCnpj, formTipoPessoa)
                                  ? 'var(--status-success)'
                                  : 'var(--status-danger)'
                                : undefined,
                          }}
                        />
                        {formTipoPessoa === 'JURÍDICA' && (
                          <Button
                            variant="primary"
                            size="md"
                            type="button"
                            onClick={handleConsultarReceitaCnpj}
                            disabled={isConsultingReceita}
                            title="Consultar CNPJ na Receita Federal (BrasilAPI / RFB)"
                            style={{ minWidth: '42px', padding: '0 12px', fontWeight: 700, height: '38px' }}
                          >
                            {isConsultingReceita ? <Loader2 size={15} className="animate-spin" /> : 'C'}
                          </Button>
                        )}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formPermitirDocLivre}
                          onChange={(e) => {
                            setFormPermitirDocLivre(e.target.checked);
                            if (!e.target.checked) {
                              setFormCpfCnpj(maskCpfCnpj(formCpfCnpj, formTipoPessoa));
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>Permitir qualquer número / Isento (Sem validação de dígitos)</span>
                      </label>
                    </div>
                  </div>

                  {/* Linha 2: Nome e Nome Abrev. */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Razão Social / Nome Completo *</label>
                      <input type="text" required placeholder="Ex: PIVETA DISTRIBUIDORA DE TINTAS LTDA" value={formNome} onChange={(e) => setFormNome(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Nome Abrev. / Fantasia</label>
                      <input type="text" placeholder="Ex: PIVETA DISTRIBUIDORA" value={formNomeAbrev} onChange={(e) => setFormNomeAbrev(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                    </div>
                  </div>

                  {/* Linha 3: Região, Convênio, Classe, Vendedor */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.5fr', gap: '14px' }}>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Região Operacional</label>
                      <select value={formRegiao} onChange={(e) => setFormRegiao(e.target.value)} className="coliseu-select" style={{ height: '38px' }}>
                        <option value="DOURADOS, DOURADOS">DOURADOS, DOURADOS</option>
                        <option value="CAMPO GRANDE, CAMPO GRANDE">CAMPO GRANDE, CAMPO GRANDE</option>
                        <option value="PONTA PORA, PONTA PORA">PONTA PORA, PONTA PORA</option>
                        <option value="NAVIRAI, NAVIRAI">NAVIRAI, NAVIRAI</option>
                        <option value="Grande Dourados">Grande Dourados</option>
                        <option value="Nacional / Outros">Nacional / Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Convênio</label>
                      <input type="text" placeholder="Sem Convênio" value={formConvenio} onChange={(e) => setFormConvenio(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Classe / Curva</label>
                      <select value={formCurva} onChange={(e) => setFormCurva(e.target.value as any)} className="coliseu-select" style={{ height: '38px' }}>
                        <option value="Curva A (VIP)">Curva A (VIP)</option>
                        <option value="Curva B">Curva B</option>
                        <option value="Curva C">Curva C</option>
                      </select>
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Vendedor / Representante</label>
                      <select value={formVendedor} onChange={(e) => setFormVendedor(e.target.value)} className="coliseu-select" style={{ height: '38px' }}>
                        <option value="<< Sem Vendedor Padrão >>">&lt;&lt; Sem Vendedor Padrão &gt;&gt;</option>
                        <option value="Roberto Silva">Roberto Silva (Matriz)</option>
                        <option value="Mariana Santos">Mariana Santos (Filial)</option>
                        <option value="Carlos Piveta">Carlos Piveta (Diretoria)</option>
                      </select>
                    </div>
                  </div>

                  {/* Linha 4: Insc. Estadual, RG, Org. Emis., Emissão RG */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1.2fr', gap: '14px' }}>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Inscrição Estadual</label>
                      <input type="text" placeholder="Isento / Nº IE" value={formInscEstadual} onChange={(e) => setFormInscEstadual(e.target.value)} className="coliseu-input text-mono" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>RG (Pessoa Física)</label>
                      <input type="text" placeholder="Nº Documento" value={formRg} onChange={(e) => setFormRg(e.target.value)} className="coliseu-input text-mono" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Órgão Emissor</label>
                      <input type="text" placeholder="SSP" value={formOrgEmis} onChange={(e) => setFormOrgEmis(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Data Emissão RG</label>
                      <input type="date" value={formEmissaoRg} onChange={(e) => setFormEmissaoRg(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                    </div>
                  </div>

                  {/* Linha 5: Naturalidade, Insc. Mun., Nascimento/Fundação, Sexo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px', gap: '14px' }}>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Naturalidade</label>
                      <input type="text" value={formNaturalidade} onChange={(e) => setFormNaturalidade(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Inscrição Municipal</label>
                      <input type="text" value={formInscMunicipal} onChange={(e) => setFormInscMunicipal(e.target.value)} className="coliseu-input text-mono" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Nascimento / Fundação</label>
                      <input type="date" value={formNascimento} onChange={(e) => setFormNascimento(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                    </div>
                    <div>
                      <label className="coliseu-label" style={{ marginBottom: '6px' }}>Sexo</label>
                      <select value={formSexo} onChange={(e) => setFormSexo(e.target.value as any)} className="coliseu-select" style={{ height: '38px' }}>
                        <option value="N/A">N/A</option>
                        <option value="M">Masc.</option>
                        <option value="F">Fem.</option>
                      </select>
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="coliseu-label" style={{ marginBottom: '6px' }}>Observações Gerais</label>
                    <textarea rows={2} value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} className="coliseu-input" style={{ height: 'auto', padding: '8px 12px', minHeight: '52px' }} />
                  </div>
                </div>
              )}

              {/* ABA 2: DADOS PESSOAIS & ENDEREÇO */}
              {modalTab === 'pessoais' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Bloco Informações de Endereço */}
                  <div className="coliseu-form-fieldset" style={{ padding: '16px' }}>
                    <span className="coliseu-form-legend" style={{ marginBottom: '14px' }}>
                      📍 Informações de Endereço & Localização
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px', gap: '14px', alignItems: 'flex-end', marginBottom: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>CEP *</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            value={formCep}
                            onChange={(e) => setFormCep(e.target.value)}
                            className="coliseu-input text-mono"
                            placeholder="79800-000"
                            style={{ flex: 1, height: '38px' }}
                          />
                          <Button
                            variant="secondary"
                            size="md"
                            type="button"
                            onClick={handleConsultarCep}
                            disabled={isConsultingCep}
                            title="Buscar endereço pelo CEP (ViaCEP)"
                            style={{ minWidth: '42px', padding: '0 12px', fontWeight: 700, height: '38px' }}
                          >
                            {isConsultingCep ? <Loader2 size={14} className="animate-spin" /> : '...'}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Município *</label>
                        <input type="text" value={formMunicipio} onChange={(e) => setFormMunicipio(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>UF *</label>
                        <input type="text" value={formUf} onChange={(e) => setFormUf(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Endereço (Logradouro) *</label>
                        <input type="text" value={formEndereco} onChange={(e) => setFormEndereco(e.target.value)} className="coliseu-input" placeholder="Av. Marcelino Pires" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Nº *</label>
                        <input type="text" value={formNumero} onChange={(e) => setFormNumero(e.target.value)} className="coliseu-input" placeholder="4500" style={{ height: '38px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Bairro</label>
                        <input type="text" value={formBairro} onChange={(e) => setFormBairro(e.target.value)} className="coliseu-input" placeholder="Jardim Clímax" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Complemento</label>
                        <input type="text" value={formComplemento} onChange={(e) => setFormComplemento(e.target.value)} className="coliseu-input" placeholder="Galpão 02 / Sala 10" style={{ height: '38px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Telefone Fixo / Comercial</label>
                        <input type="text" value={formFoneRes} onChange={(e) => setFormFoneRes(e.target.value)} className="coliseu-input text-mono" placeholder="(67) 3421-0000" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Celular / WhatsApp Principal *</label>
                        <input type="text" value={formCelularWhats} onChange={(e) => setFormCelularWhats(e.target.value)} className="coliseu-input text-mono" placeholder="(67) 99999-0000" style={{ height: '38px' }} />
                      </div>
                    </div>
                  </div>

                  {/* Bloco Informações Profissionais */}
                  <div className="coliseu-form-fieldset" style={{ padding: '16px' }}>
                    <span className="coliseu-form-legend" style={{ marginBottom: '14px' }}>
                      💼 Informações Profissionais & Filiação
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Profissão / Ramo de Atividade</label>
                        <input type="text" value={formProfissao} onChange={(e) => setFormProfissao(e.target.value)} className="coliseu-input" placeholder="Ex: Empresário / Funileiro" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Renda Mensal Líquida (R$)</label>
                        <input type="text" value={formRendaMensalLiq} onChange={(e) => setFormRendaMensalLiq(e.target.value)} className="coliseu-input text-mono" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Tempo de Serviço (Meses)</label>
                        <input type="number" value={formTempoServicoMeses} onChange={(e) => setFormTempoServicoMeses(parseInt(e.target.value, 10) || 0)} className="coliseu-input text-mono" style={{ height: '38px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Nome do Pai</label>
                        <input type="text" value={formPai} onChange={(e) => setFormPai(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Nome da Mãe</label>
                        <input type="text" value={formMae} onChange={(e) => setFormMae(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: CRÉDITO & INFORMAÇÕES DIGITAIS */}
              {modalTab === 'comercial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Bloco Parâmetros de Crédito */}
                  <div className="coliseu-form-fieldset" style={{ padding: '16px' }}>
                    <span className="coliseu-form-legend" style={{ marginBottom: '14px' }}>
                      💳 Limites, Crédito & Prazos de Faturamento
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Limite de Crédito Concedido (R$)</label>
                        <input type="text" value={formLimiteCredito} onChange={(e) => setFormLimiteCredito(e.target.value)} className="coliseu-input text-mono" style={{ fontWeight: 700, color: 'var(--action-primary)', height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Validade do Limite</label>
                        <input type="date" value={formValidadeLimite} onChange={(e) => setFormValidadeLimite(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Dia Vencimento Preferencial</label>
                        <input type="number" min="1" max="31" value={formDiaVencimento} onChange={(e) => setFormDiaVencimento(parseInt(e.target.value, 10) || 15)} className="coliseu-input text-mono" style={{ height: '38px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Score de Crédito (0 a 1000)</label>
                        <input type="number" min="0" max="1000" value={formScore} onChange={(e) => setFormScore(parseInt(e.target.value, 10) || 800)} className="coliseu-input text-mono" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Tabela de Preço Padrão</label>
                        <select value={formTabelaPreco} onChange={(e) => setFormTabelaPreco(e.target.value)} className="coliseu-select" style={{ height: '38px' }}>
                          <option value="Tabela Atacado Padrão">Tabela Atacado Padrão</option>
                          <option value="Tabela Varejo">Tabela Varejo</option>
                          <option value="Distribuidor VIP">Distribuidor VIP</option>
                          <option value="Tabela Frotistas & Empresas">Tabela Frotistas & Empresas</option>
                        </select>
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Condição de Pagamento</label>
                        <select value={formCondicaoPagto} onChange={(e) => setFormCondicaoPagto(e.target.value)} className="coliseu-select" style={{ height: '38px' }}>
                          <option value="À Vista">À Vista</option>
                          <option value="30 Dias">30 Dias</option>
                          <option value="30/60 Dias">30/60 Dias</option>
                          <option value="30/60/90 Dias">30/60/90 Dias</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bloco Informações Digitais */}
                  <div className="coliseu-form-fieldset" style={{ padding: '16px' }}>
                    <span className="coliseu-form-legend" style={{ marginBottom: '14px' }}>
                      🌐 Informações Digitais & Comunicação
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Email Principal (NF-e/XML)</label>
                        <input type="email" value={formEmailPrincipal} onChange={(e) => setFormEmailPrincipal(e.target.value)} className="coliseu-input" placeholder="contato@empresa.com.br" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Email Financeiro (Boletos)</label>
                        <input type="email" value={formEmailFinanceiro} onChange={(e) => setFormEmailFinanceiro(e.target.value)} className="coliseu-input" placeholder="financeiro@empresa.com.br" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Site / Página Web</label>
                        <input type="text" value={formSite} onChange={(e) => setFormSite(e.target.value)} className="coliseu-input" placeholder="www.empresa.com.br" style={{ height: '38px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 4: VEÍCULOS & OUTROS */}
              {modalTab === 'outros' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="coliseu-form-fieldset" style={{ padding: '16px' }}>
                    <span className="coliseu-form-legend" style={{ marginBottom: '14px' }}>
                      🚗 Dados de Veículo & Logística do Parceiro
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Placa do Veículo</label>
                        <input type="text" value={formPlacaVeiculo} onChange={(e) => setFormPlacaVeiculo(e.target.value)} className="coliseu-input text-mono" placeholder="ABC-1234" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Modelo / Descrição</label>
                        <input type="text" value={formModeloVeiculo} onChange={(e) => setFormModeloVeiculo(e.target.value)} className="coliseu-input" placeholder="Ex: Scania R450 / VW Delivery" style={{ height: '38px' }} />
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Ano</label>
                        <input type="text" value={formAnoVeiculo} onChange={(e) => setFormAnoVeiculo(e.target.value)} className="coliseu-input" placeholder="2023" style={{ height: '38px' }} />
                      </div>
                    </div>
                  </div>

                  <div className="coliseu-form-fieldset" style={{ padding: '16px' }}>
                    <span className="coliseu-form-legend" style={{ marginBottom: '14px' }}>
                      ⚙️ Parâmetros Fiscais & Cadastro
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '14px' }}>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Substituto Tributário</label>
                        <select value={formSubstituto} onChange={(e) => setFormSubstituto(e.target.value)} className="coliseu-select" style={{ height: '38px' }}>
                          <option value="NÃO">NÃO</option>
                          <option value="SIM">SIM</option>
                        </select>
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Status do Cadastro</label>
                        <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)} className="coliseu-select" style={{ height: '38px' }}>
                          <option value="Ativo">Ativo (Operação Liberada)</option>
                          <option value="Bloqueado">Bloqueado (Restrição)</option>
                          <option value="Em Análise">Em Análise</option>
                        </select>
                      </div>
                      <div>
                        <label className="coliseu-label" style={{ marginBottom: '6px' }}>Data do Cadastro</label>
                        <input type="date" value={formDataCadastro} onChange={(e) => setFormDataCadastro(e.target.value)} className="coliseu-input" style={{ height: '38px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de Ações Estilo Coliseu Sistemas com Atalhos Padronizados */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: 'auto',
                }}
              >
                <div>
                  {modalMode === 'edit' && (
                    <Button
                      variant="danger"
                      size="md"
                      type="button"
                      leftIcon={<Trash2 size={15} />}
                      onClick={() => {
                        handleExcluirPessoa(formId);
                        setIsModalOpen(false);
                      }}
                    >
                      Eliminar (F6)
                    </Button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Button
                    variant="secondary"
                    size="md"
                    type="button"
                    leftIcon={<X size={15} />}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Fechar (ESC)
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    leftIcon={<Check size={16} />}
                  >
                    {modalMode === 'create' ? 'Salvar Cadastro (F5)' : 'Atualizar Cadastro (F5)'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
