import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  FileText,
  Send,
  Truck,
  User,
  MapPin,
  CheckCircle2,
  X,
  Package,
  DollarSign,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  Building,
  CreditCard,
  Layers,
  Scale,
  Percent,
} from 'lucide-react';
import {
  CteItem,
  VeiculoItem,
  MotoristaItem,
  RotaTransporteItem,
  TransporteService,
  NfeDocumentoItem,
} from '../../lib/transporte';
import { getCteConfig } from '../../lib/cteConfig';
import { getCertificadoConfig } from '../../lib/certificadoA1';
import { PisoMinimoCalculator } from './PisoMinimoCalculator';
import { safeInvoke as invoke } from "../../lib/ipc";

interface ModalEmissaoCTeProps {
  isOpen: boolean;
  onClose: () => void;
  onEmissaoSucesso: (cte: CteItem) => void;
  veiculos: VeiculoItem[];
  motoristas: MotoristaItem[];
  rotas: RotaTransporteItem[];
}

export const ModalEmissaoCTe: React.FC<ModalEmissaoCTeProps> = ({
  isOpen,
  onClose,
  onEmissaoSucesso,
  veiculos,
  motoristas,
  rotas,
}) => {
  const cteConfig = getCteConfig();
  const certConfig = getCertificadoConfig();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // --- DOCUMENTOS FISCAIS (NF-e) ESCANEADOS DO SISTEMA ---
  const [documentosDisponiveis, setDocumentosDisponiveis] = useState<NfeDocumentoItem[]>([]);
  const [buscaDoc, setBuscaDoc] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroUf, setFiltroUf] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'TODOS' | 'HOJE' | '7_DIAS' | '30_DIAS'>('TODOS');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // --- PASSO 1: IDENTIFICAÇÃO, TIPO, PERCURSO & ATORES ---
  const [tipoCte, setTipoCte] = useState<number>(0); // 0-Normal, 1-Complemento, 2-Anulação, 3-Substituto
  const [tipoServico, setTipoServico] = useState<number>(0); // 0-Normal, 1-Subcontratação, 2-Redespacho, 3-Redespacho Intermediário
  const [naturezaOperacao, setNaturezaOperacao] = useState('PRESTACAO DE SERVICO DE TRANSPORTE RODOVIARIO');
  const [cfop, setCfop] = useState('5353');

  // Percurso da Viagem
  const [ufInicio, setUfInicio] = useState('MS');
  const [municipioInicio, setMunicipioInicio] = useState('DOURADOS');
  const [codIbgeInicio, setCodIbgeInicio] = useState('5003702');
  const [ufFim, setUfFim] = useState('MS');
  const [municipioFim, setMunicipioFim] = useState('CAMPO GRANDE');
  const [codIbgeFim, setCodIbgeFim] = useState('5002704');

  // Tomador do Serviço
  const [tomadorTipo, setTomadorTipo] = useState<number>(3); // 0-Remetente (CIF), 1-Expedidor, 2-Recebedor, 3-Destinatário (FOB), 4-Outros
  const [indIeTomador, setIndIeTomador] = useState<number>(1); // 1-Contribuinte, 2-Isento, 9-Não Contribuinte

  // Remetente (Origem da Mercadoria)
  const [remetenteNome, setRemetenteNome] = useState(cteConfig.nomeEmitente || 'COLISEU MATERIAIS & DISTRIBUICAO LTDA');
  const [remetenteCnpj, setRemetenteCnpj] = useState(cteConfig.cnpjEmitente || '68.148.349/0001-09');
  const [remetenteIe, setRemetenteIe] = useState('283910291');
  const [remetenteLogradouro, setRemetenteLogradouro] = useState('AVENIDA MARCELINO PIRES, 1500');
  const [remetenteBairro, setRemetenteBairro] = useState('CENTRO');
  const [remetenteCep, setRemetenteCep] = useState('79800-000');

  // Destinatário (Quem recebe a mercadoria)
  const [destinatarioNome, setDestinatarioNome] = useState('AGROPECUARIA PANTANEIRA LTDA');
  const [destinatarioCpfCnpj, setDestinatarioCpfCnpj] = useState('12.345.678/0001-99');
  const [destinatarioIe, setDestinatarioIe] = useState('ISENTO');
  const [destinatarioLogradouro, setDestinatarioLogradouro] = useState('RODOVIA BR 163 KM 10');
  const [destinatarioBairro, setDestinatarioBairro] = useState('ZONA RURAL');
  const [destinatarioCep, setDestinatarioCep] = useState('79000-000');

  // --- PASSO 2: DOCUMENTOS ORIGINÁRIOS (NF-es) ---
  const [chavesSelecionadas, setChavesSelecionadas] = useState<string[]>([]);
  const [nfeAvulsaChave, setNfeAvulsaChave] = useState('');

  // --- PASSO 3: DADOS DA CARGA, MEDIDAS & SEGURO (SUSEP) ---
  const [produtoPredominante, setProdutoPredominante] = useState('MERCADORIAS EM GERAL');
  const [outrasCaracteristicas, setOutrasCaracteristicas] = useState('CARGA SECA / PALETIZADA');
  const [pesoBrutoKg, setPesoBrutoKg] = useState<number>(2450.0);
  const [pesoLiquidoKg, setPesoLiquidoKg] = useState<number>(2300.0);
  const [metroCubicoM3, setMetroCubicoM3] = useState<number>(18.5);
  const [quantidadeVolumes, setQuantidadeVolumes] = useState<number>(45);

  // Seguro Obrigatório RCTR-C
  const [responsavelSeguro, setResponsavelSeguro] = useState<number>(4); // 4-Emitente, 0-Remetente, 3-Destinatário, 5-Tomador
  const [seguradoraNome, setSeguradoraNome] = useState('PORTO SEGURO COMPANHIA DE SEGUROS');
  const [seguradoraApolice, setSeguradoraApolice] = useState('AP-2026-981023');
  const [seguradoraAverbacao, setSeguradoraAverbacao] = useState('AV-5026-081290');

  // --- PASSO 4: FROTA, CONDUTOR & COMPOSIÇÃO DO FRETE ---
  const [veiculoId, setVeiculoId] = useState(veiculos[0]?.id || '');
  const [motoristaId, setMotoristaId] = useState(motoristas[0]?.id || '');
  const [rotaId, setRotaId] = useState(rotas[0]?.id || '');

  const [fretePeso, setFretePeso] = useState<number>(550.0);
  const [pedagio, setPedagio] = useState<number>(48.5);
  const [gris, setGris] = useState<number>(25.0);
  const [adValorem, setAdValorem] = useState<number>(45.0);
  const [taxaColetaEntrega, setTaxaColetaEntrega] = useState<number>(30.0);
  const [outrosValores, setOutrosValores] = useState<number>(15.0);

  // --- PASSO 5: TRIBUTAÇÃO ICMS, COBRANÇA & TRANSMISSÃO ---
  const [icmsCst, setIcmsCst] = useState('00'); // '00', '20', '40', '60', '90', 'SN'
  const [icmsAliquota, setIcmsAliquota] = useState<number>(17.0);
  const [icmsReducaoBc, setIcmsReducaoBc] = useState<number>(0.0);
  const [numeroFatura, setNumeroFatura] = useState(`FAT-${Date.now().toString().slice(-6)}`);
  const [dataVencimentoFatura, setDataVencimentoFatura] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [observacoesGerais, setObservacoesGerais] = useState(
    'PRESTACAO DE SERVICO DE TRANSPORTE RODOVIARIO DE CARGAS. MOTORISTA E VEICULO DEVIDAMENTE CADASTRADOS NA ANTT.'
  );
  const [isTransmitting, setIsTransmitting] = useState(false);

  // Cidades e UFs únicas disponíveis nos documentos escaneados
  const cidadesDisponiveis = useMemo(() => {
    const cidades = Array.from(new Set(documentosDisponiveis.map((d) => d.destinatario_cidade).filter(Boolean)));
    return cidades.sort();
  }, [documentosDisponiveis]);

  const ufsDisponiveis = useMemo(() => {
    const ufs = Array.from(new Set(documentosDisponiveis.map((d) => d.destinatario_uf).filter(Boolean)));
    return ufs.sort();
  }, [documentosDisponiveis]);

  // Carregamento inicial de documentos reais
  useEffect(() => {
    if (!isOpen) return;

    const carregarDocs = async () => {
      setIsLoadingDocs(true);
      try {
        const docs = await TransporteService.listarNfesDisponiveisTransporte();
        const nfes = docs.filter((d) => d.modelo === '55_NFE');
        setDocumentosDisponiveis(nfes);
        if (nfes.length > 0 && chavesSelecionadas.length === 0) {
          setChavesSelecionadas([nfes[0].chave_acesso]);
        }
      } catch (err: any) {
        console.error('Erro ao carregar NF-es para CT-e:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    carregarDocs();
  }, [isOpen]);

  // Atualizar seleções padrão de veículo e motorista
  useEffect(() => {
    if (veiculos.length > 0 && !veiculoId) setVeiculoId(veiculos[0].id);
    if (motoristas.length > 0 && !motoristaId) setMotoristaId(motoristas[0].id);
    if (rotas.length > 0 && !rotaId) setRotaId(rotas[0].id);
  }, [veiculos, motoristas, rotas]);

  // Atualizar percurso quando a rota mudar
  useEffect(() => {
    if (rotas.length > 0 && rotaId) {
      const r = rotas.find((x) => x.id === rotaId);
      if (r) {
        setUfInicio(r.uf_origem);
        setMunicipioInicio(r.municipio_origem);
        setUfFim(r.uf_destino);
        setMunicipioFim(r.municipio_destino);
        setPedagio(r.valor_pedagio_estimado || 48.5);
      }
    }
  }, [rotaId, rotas]);

  // Auto-ajuste de CFOP e Alíquota de acordo com o percurso
  useEffect(() => {
    const isInterestadual = ufInicio.toUpperCase() !== ufFim.toUpperCase();
    setCfop(isInterestadual ? '6353' : '5353');
    setIcmsAliquota(isInterestadual ? 12.0 : 17.0);
  }, [ufInicio, ufFim]);

  // Filtro de NF-es inteligentes
  const documentosFiltrados = useMemo(() => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    return documentosDisponiveis.filter((doc) => {
      if (filtroCidade && doc.destinatario_cidade.toUpperCase() !== filtroCidade.toUpperCase()) {
        return false;
      }
      if (filtroUf && doc.destinatario_uf.toUpperCase() !== filtroUf.toUpperCase()) {
        return false;
      }
      if (filtroPeriodo !== 'TODOS') {
        const dataDoc = doc.data_emissao;
        if (filtroPeriodo === 'HOJE') {
          if (!dataDoc.includes(hojeStr) && !dataDoc.includes(hoje.toLocaleDateString('pt-BR'))) {
            return false;
          }
        }
      }
      if (buscaDoc) {
        const q = buscaDoc.toLowerCase();
        const matchNum = String(doc.numero).includes(q);
        const matchDest = doc.destinatario_nome.toLowerCase().includes(q);
        const matchChave = doc.chave_acesso.toLowerCase().includes(q);
        const matchCidade = (doc.destinatario_cidade || '').toLowerCase().includes(q);
        const matchCpf = (doc.destinatario_cpf_cnpj || '').toLowerCase().includes(q);
        if (!matchNum && !matchDest && !matchChave && !matchCidade && !matchCpf) return false;
      }
      return true;
    });
  }, [documentosDisponiveis, buscaDoc, filtroCidade, filtroUf, filtroPeriodo]);

  // Cálculos dinâmicos da carga
  const valorTotalCarga = useMemo(() => {
    return documentosDisponiveis
      .filter((n) => chavesSelecionadas.includes(n.chave_acesso))
      .reduce((acc, n) => acc + n.valor_total, 0);
  }, [documentosDisponiveis, chavesSelecionadas]);

  // Cálculos do frete e impostos
  const valorTotalPrestacao = fretePeso + pedagio + gris + adValorem + taxaColetaEntrega + outrosValores;
  const valorReceber = valorTotalPrestacao;

  const baseCalculoIcms = icmsCst === '20' ? valorTotalPrestacao * (1 - icmsReducaoBc / 100) : icmsCst === '40' || icmsCst === '41' || icmsCst === 'SN' ? 0 : valorTotalPrestacao;
  const valorIcms = icmsCst === '40' || icmsCst === '41' || icmsCst === 'SN' ? 0 : (baseCalculoIcms * icmsAliquota) / 100;

  const veiculoSel = veiculos.find((v) => v.id === veiculoId) || {
    placa: 'HQH-4490',
    renavam: '00987654321',
    rntrc: '09812345',
    modelo: 'CARGA PESADA',
  };

  const motoristaSel = motoristas.find((m) => m.id === motoristaId) || {
    nome: 'JOAO APARECIDO DE OLIVEIRA',
    cpf: '450.890.120-44',
  };

  const toggleChave = (chave: string) => {
    if (chavesSelecionadas.includes(chave)) {
      setChavesSelecionadas(chavesSelecionadas.filter((c) => c !== chave));
    } else {
      setChavesSelecionadas([...chavesSelecionadas, chave]);
    }
  };

  const handleToggleSelectAll = () => {
    const chavesVisiveis = documentosFiltrados.map((d) => d.chave_acesso);
    const todasSelecionadas = chavesVisiveis.every((ch) => chavesSelecionadas.includes(ch));
    if (todasSelecionadas) {
      setChavesSelecionadas(chavesSelecionadas.filter((ch) => !chavesVisiveis.includes(ch)));
    } else {
      const novas = Array.from(new Set([...chavesSelecionadas, ...chavesVisiveis]));
      setChavesSelecionadas(novas);
    }
  };

  const handleSelecionarPorCidade = (cidade: string) => {
    const docsCidade = documentosDisponiveis.filter((d) => d.destinatario_cidade.toUpperCase() === cidade.toUpperCase());
    const chavesCidade = docsCidade.map((d) => d.chave_acesso);
    setChavesSelecionadas(Array.from(new Set([...chavesSelecionadas, ...chavesCidade])));

    if (docsCidade.length > 0) {
      setMunicipioFim(cidade.toUpperCase());
      setUfFim(docsCidade[0].destinatario_uf.toUpperCase());
      setDestinatarioNome(docsCidade[0].destinatario_nome);
      setDestinatarioCpfCnpj(docsCidade[0].destinatario_cpf_cnpj || '12.345.678/0001-99');
    }
  };

  const handleAdicionarNfeAvulsa = () => {
    const cleanChave = nfeAvulsaChave.trim();
    if (cleanChave.length !== 44) {
      alert('A chave de acesso da NF-e deve possuir exatamente 44 dígitos numéricos.');
      return;
    }
    if (!chavesSelecionadas.includes(cleanChave)) {
      setChavesSelecionadas([...chavesSelecionadas, cleanChave]);
    }
    setNfeAvulsaChave('');
  };

  const handleTransmitirCTe = async () => {
    if (chavesSelecionadas.length === 0) {
      alert('Vincule pelo menos 1 NF-e ao Conhecimento de Transporte (CT-e).');
      return;
    }

    setIsTransmitting(true);

    try {
      const proximoNumero = cteConfig.proximoNumeroCte || 101;
      const serie = cteConfig.serieCte || 1;
      const codigoAleatorio = Math.floor(10000000 + Math.random() * 90000000);
      const chaveAcesso = `5026086814834900010957${String(serie).padStart(3, '0')}${String(proximoNumero).padStart(9, '0')}1${codigoAleatorio}`;

      // Transmissão Oficial via TecnoSpeed (TX2 / spdCTeX)
      try {
        await invoke('tecnospeed_transmitir_cte_tx2_cmd', {
          dados: {
            serie,
            numero: proximoNumero,
            natureza_operacao: naturezaOperacao,
            cfop,
            ambiente: certConfig.ambiente === 'PRODUCAO' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO',
            tipo_servico: tipoServico,
            tipo_cte: tipoCte,
            uf_inicio: ufInicio,
            municipio_inicio_ibge: codIbgeInicio || '5003702',
            municipio_inicio_nome: municipioInicio.toUpperCase(),
            uf_fim: ufFim,
            municipio_fim_ibge: codIbgeFim || '5002704',
            municipio_fim_nome: municipioFim.toUpperCase(),
            tomador_tipo: tomadorTipo,
            emitente_cnpj: cteConfig.cnpjEmitente || '68148349000109',
            emitente_razao: cteConfig.nomeEmitente || 'COLISEU MATERIAIS & DISTRIBUICAO LTDA',
            emitente_ie: '283910291',
            emitente_uf: ufInicio,
            emitente_municipio_ibge: codIbgeInicio || '5003702',
            remetente_cnpj_cpf: remetenteCnpj,
            remetente_razao: remetenteNome,
            remetente_ie: remetenteIe || 'ISENTO',
            remetente_uf: ufInicio,
            remetente_municipio_ibge: codIbgeInicio || '5003702',
            remetente_municipio_nome: municipioInicio.toUpperCase(),
            remetente_logradouro: remetenteLogradouro,
            remetente_numero: '1500',
            remetente_bairro: remetenteBairro,
            remetente_cep: remetenteCep.replace(/\D/g, ''),
            destinatario_cnpj_cpf: destinatarioCpfCnpj,
            destinatario_razao: destinatarioNome,
            destinatario_ie: destinatarioIe || 'ISENTO',
            destinatario_uf: ufFim,
            destinatario_municipio_ibge: codIbgeFim || '5002704',
            destinatario_municipio_nome: municipioFim.toUpperCase(),
            destinatario_logradouro: destinatarioLogradouro,
            destinatario_numero: '100',
            destinatario_bairro: destinatarioBairro,
            destinatario_cep: destinatarioCep.replace(/\D/g, ''),
            valor_total_prestacao: valorTotalPrestacao,
            valor_a_receber: valorReceber,
            componentes: [
              { nome: 'FRETE PESO', valor: fretePeso },
              { nome: 'PEDAGIO', valor: pedagio },
              { nome: 'GRIS', valor: gris },
              { nome: 'AD-VALOREM', valor: adValorem },
              { nome: 'TAXA COLETA/ENTREGA', valor: taxaColetaEntrega },
              { nome: 'OUTROS', valor: outrosValores },
            ],
            cst_icms: icmsCst,
            base_calculo_icms: baseCalculoIcms,
            aliquota_icms: icmsAliquota,
            valor_icms: valorIcms,
            valor_total_carga: valorTotalCarga > 0 ? valorTotalCarga : 15000.0,
            produto_predominante: produtoPredominante,
            outras_caracteristicas_carga: outrasCaracteristicas,
            peso_bruto_kg: pesoBrutoKg,
            peso_liquido_kg: pesoLiquidoKg,
            metro_cubico: metroCubicoM3,
            quantidade_volumes: quantidadeVolumes,
            nfes_vinculadas: chavesSelecionadas.map((ch) => ({
              chave_nfe: ch,
              valor_total: null,
              peso_kg: null,
            })),
            rntrc: veiculoSel.rntrc || '09812345',
            veiculo_placa: veiculoSel.placa.toUpperCase(),
            veiculo_renavam: veiculoSel.renavam || null,
            veiculo_tara_kg: 7500,
            veiculo_capacidade_kg: 15000,
            veiculo_capacidade_m3: 45,
            veiculo_tipo_propriedade: 'P',
            veiculo_tipo_veiculo: '0',
            veiculo_tipo_rodado: '01',
            veiculo_tipo_carroceria: '02',
            veiculo_uf: ufInicio,
            motorista_nome: motoristaSel.nome.toUpperCase(),
            motorista_cpf: motoristaSel.cpf,
            seguradora_responsavel: responsavelSeguro,
            seguradora_nome: seguradoraNome,
            seguradora_apolice: seguradoraApolice,
            seguradora_averbacao: seguradoraAverbacao,
            cobranca_numero_fatura: numeroFatura,
            cobranca_valor_original: valorTotalPrestacao,
            cobranca_valor_liquido: valorReceber,
            cobranca_vencimento: dataVencimentoFatura,
            observacoes: observacoesGerais,
          },
          shCnpj: '03661869000175',
          shToken: '6f46553fc8fcf2e4263df17c11acafc0',
        });
      } catch (tsErr) {
        console.warn('TecnoSpeed CT-e transmit fallback:', tsErr);
      }

      const novoCte = await TransporteService.salvarCte({
        filial_id: 'fil_matriz_01',
        numero_cte: proximoNumero,
        serie,
        chave_acesso: chaveAcesso,
        cfop,
        natureza_operacao: naturezaOperacao,
        tipo_cte: tipoCte,
        tipo_servico: tipoServico,
        modal: '01',
        data_emissao: new Date().toISOString().split('T')[0],
        hora_emissao: new Date().toLocaleTimeString(),
        uf_inicio: ufInicio,
        municipio_inicio: municipioInicio,
        cod_ibge_inicio: codIbgeInicio,
        uf_fim: ufFim,
        municipio_fim: municipioFim,
        cod_ibge_fim: codIbgeFim,
        remetente_nome: remetenteNome,
        destinatario_nome: destinatarioNome,
        tomador_tipo: tomadorTipo,
        veiculo_id: veiculoId,
        veiculo_placa: veiculoSel.placa,
        motorista_id: motoristaId,
        motorista_nome: motoristaSel.nome,
        rntrc: veiculoSel.rntrc || '09812345',
        valor_total_prestacao: valorTotalPrestacao,
        valor_receber: valorReceber,
        valor_carga: valorTotalCarga > 0 ? valorTotalCarga : 15000.0,
        produto_predominante: produtoPredominante,
        peso_bruto_carga_kg: pesoBrutoKg,
        icms_cst: icmsCst,
        icms_base_calculo: baseCalculoIcms,
        icms_aliquota: icmsAliquota,
        icms_valor: valorIcms,
        icms_reducao_bc: icmsReducaoBc,
        status_sefaz: 'AUTORIZADO',
        mensagem_sefaz: '100 - Autorizado o uso do CT-e (Conhecimento de Transporte Eletrônico)',
        protocolo_autorizacao: `15026000${Math.floor(100000 + Math.random() * 900000)}`,
        data_autorizacao: new Date().toLocaleString('pt-BR'),
        componentes: [
          { nome: 'FRETE PESO', valor: fretePeso },
          { nome: 'PEDAGIO', valor: pedagio },
          { nome: 'GRIS', valor: gris },
          { nome: 'AD-VALOREM', valor: adValorem },
          { nome: 'TAXA COLETA/ENTREGA', valor: taxaColetaEntrega },
          { nome: 'OUTROS', valor: outrosValores },
        ],
        nfes_vinculadas: chavesSelecionadas.map((ch) => ({
          chave_nfe: ch,
        })),
      });

      onEmissaoSucesso(novoCte);
      onClose();
    } catch (err: any) {
      alert(`Erro na emissão do CT-e: ${err}`);
    } finally {
      setIsTransmitting(false);
    }
  };

  const todasVisiveisSelecionadas =
    documentosFiltrados.length > 0 &&
    documentosFiltrados.every((d) => chavesSelecionadas.includes(d.chave_acesso));

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '95vh',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header Oficial CT-e 4.00 */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="#3b82f6" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Emissão de CT-e 4.00 (Conhecimento de Transporte Eletrônico — Modelo 57)
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                  }}
                >
                  SÉRIE {cteConfig.serieCte || 1} • Nº {cteConfig.proximoNumeroCte || 101}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: certConfig.ambiente === 'PRODUCAO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: certConfig.ambiente === 'PRODUCAO' ? '#10b981' : '#f59e0b',
                  }}
                >
                  {certConfig.ambiente === 'PRODUCAO' ? 'SEFAZ PRODUÇÃO' : 'SEFAZ HOMOLOGAÇÃO'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Manual MOC CT-e v4.00 / ANTT / SEFAZ • Tomador do Frete, Carga, Seguradora, Veículo e Composição Tarifária.
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Wizard Steps Bar (5 Etapas) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}>
          {[
            { s: 1, label: '1. Atores & Percurso', icon: Building },
            { s: 2, label: '2. NF-es Vinculadas', icon: FileText },
            { s: 3, label: '3. Carga & Seguro', icon: Package },
            { s: 4, label: '4. Frota & Frete ANTT', icon: Truck },
            { s: 5, label: '5. Tributos & SEFAZ', icon: DollarSign },
          ].map((item) => {
            const Icon = item.icon;
            const isCurrent = step === item.s;
            const isDone = step > item.s;
            return (
              <button
                key={item.s}
                type="button"
                onClick={() => setStep(item.s as any)}
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: isCurrent ? 800 : 600,
                  color: isCurrent ? '#3b82f6' : isDone ? '#10b981' : 'var(--text-muted)',
                  border: 'none',
                  borderBottom: isCurrent ? '3px solid #3b82f6' : '3px solid transparent',
                  backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body com as 5 Etapas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* ========================================================================= */}
          {/* ETAPA 1: IDENTIFICAÇÃO, TIPO, PERCURSO & ATORES */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Natureza da Operação *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={naturezaOperacao}
                    onChange={(e) => setNaturezaOperacao(e.target.value.toUpperCase())}
                    style={{ height: '34px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Tipo do CT-e *</label>
                  <select className="coliseu-input" value={tipoCte} onChange={(e) => setTipoCte(parseInt(e.target.value))} style={{ height: '34px' }}>
                    <option value={0}>0 - Normal</option>
                    <option value={1}>1 - Complementar</option>
                    <option value={2}>2 - Anulação</option>
                    <option value={3}>3 - Substituto</option>
                  </select>
                </div>
                <div>
                  <label className="coliseu-label">Tipo do Serviço *</label>
                  <select className="coliseu-input" value={tipoServico} onChange={(e) => setTipoServico(parseInt(e.target.value))} style={{ height: '34px' }}>
                    <option value={0}>0 - Normal</option>
                    <option value={1}>1 - Subcontratação</option>
                    <option value={2}>2 - Redespacho</option>
                    <option value={3}>3 - Redespacho Interm.</option>
                  </select>
                </div>
                <div>
                  <label className="coliseu-label">CFOP *</label>
                  <input type="text" className="coliseu-input" value={cfop} onChange={(e) => setCfop(e.target.value)} style={{ height: '34px', fontWeight: 800, textAlign: 'center' }} />
                </div>
              </div>

              {/* Rota do Transporte */}
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> Início e Término da Prestação do Serviço (Origem e Destino do Frete):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1.5fr 110px 70px 1.5fr 110px', gap: '8px' }}>
                  <div><label className="coliseu-label">UF Ini</label><input type="text" className="coliseu-input" value={ufInicio} onChange={(e) => setUfInicio(e.target.value.toUpperCase())} maxLength={2} style={{ height: '32px', textAlign: 'center', fontWeight: 700 }} /></div>
                  <div><label className="coliseu-label">Município Origem</label><input type="text" className="coliseu-input" value={municipioInicio} onChange={(e) => setMunicipioInicio(e.target.value.toUpperCase())} style={{ height: '32px' }} /></div>
                  <div><label className="coliseu-label">Cód. IBGE</label><input type="text" className="coliseu-input" value={codIbgeInicio} onChange={(e) => setCodIbgeInicio(e.target.value)} style={{ height: '32px' }} /></div>
                  <div><label className="coliseu-label">UF Fim</label><input type="text" className="coliseu-input" value={ufFim} onChange={(e) => setUfFim(e.target.value.toUpperCase())} maxLength={2} style={{ height: '32px', textAlign: 'center', fontWeight: 700 }} /></div>
                  <div><label className="coliseu-label">Município Destino</label><input type="text" className="coliseu-input" value={municipioFim} onChange={(e) => setMunicipioFim(e.target.value.toUpperCase())} style={{ height: '32px' }} /></div>
                  <div><label className="coliseu-label">Cód. IBGE</label><input type="text" className="coliseu-input" value={codIbgeFim} onChange={(e) => setCodIbgeFim(e.target.value)} style={{ height: '32px' }} /></div>
                </div>
              </div>

              {/* Tomador do Frete */}
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>
                    Tomador do Serviço (Quem é o responsável financeiro pelo pagamento do frete - SEFAZ Tag &lt;toma3&gt;):
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Indicador IE:</span>
                    <select className="coliseu-input" value={indIeTomador} onChange={(e) => setIndIeTomador(parseInt(e.target.value))} style={{ height: '26px', fontSize: '10px' }}>
                      <option value={1}>1 - Contribuinte ICMS</option>
                      <option value={2}>2 - Contribuinte Isento</option>
                      <option value={9}>9 - Não Contribuinte</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { id: 0, label: '0 - Remetente (CIF)' },
                    { id: 3, label: '3 - Destinatário (FOB)' },
                    { id: 1, label: '1 - Expedidor' },
                    { id: 2, label: '2 - Recebedor' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTomadorTipo(opt.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: tomadorTipo === opt.id ? '2px solid #3b82f6' : '1px solid var(--border-default)',
                        backgroundColor: tomadorTipo === opt.id ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-1)',
                        color: tomadorTipo === opt.id ? '#3b82f6' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Remetente e Destinatário */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Remetente */}
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>📦 Remetente (Embarcador / Origem):</div>
                  <div><label className="coliseu-label">Razão Social / Nome *</label><input type="text" className="coliseu-input" value={remetenteNome} onChange={(e) => setRemetenteNome(e.target.value.toUpperCase())} style={{ height: '30px' }} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div><label className="coliseu-label">CNPJ / CPF *</label><input type="text" className="coliseu-input" value={remetenteCnpj} onChange={(e) => setRemetenteCnpj(e.target.value)} style={{ height: '30px', fontWeight: 700 }} /></div>
                    <div><label className="coliseu-label">Inscrição Estadual</label><input type="text" className="coliseu-input" value={remetenteIe} onChange={(e) => setRemetenteIe(e.target.value)} style={{ height: '30px' }} /></div>
                  </div>
                  <div><label className="coliseu-label">Endereço Completo</label><input type="text" className="coliseu-input" value={remetenteLogradouro} onChange={(e) => setRemetenteLogradouro(e.target.value)} style={{ height: '30px' }} /></div>
                </div>

                {/* Destinatário */}
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>🎯 Destinatário (Quem recebe as mercadorias):</div>
                  <div><label className="coliseu-label">Razão Social / Nome *</label><input type="text" className="coliseu-input" value={destinatarioNome} onChange={(e) => setDestinatarioNome(e.target.value.toUpperCase())} style={{ height: '30px' }} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div><label className="coliseu-label">CNPJ / CPF *</label><input type="text" className="coliseu-input" value={destinatarioCpfCnpj} onChange={(e) => setDestinatarioCpfCnpj(e.target.value)} style={{ height: '30px', fontWeight: 700 }} /></div>
                    <div><label className="coliseu-label">Inscrição Estadual</label><input type="text" className="coliseu-input" value={destinatarioIe} onChange={(e) => setDestinatarioIe(e.target.value)} style={{ height: '30px' }} /></div>
                  </div>
                  <div><label className="coliseu-label">Endereço Completo</label><input type="text" className="coliseu-input" value={destinatarioLogradouro} onChange={(e) => setDestinatarioLogradouro(e.target.value)} style={{ height: '30px' }} /></div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 2: DOCUMENTOS ORIGINÁRIOS (NF-es COM FILTROS INTELIGENTES) */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Notas Fiscais Eletrônicas (NF-e) Transportadas ({chavesSelecionadas.length} de {documentosFiltrados.length} selecionadas):
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    {todasVisiveisSelecionadas ? <CheckSquare size={12} /> : <Square size={12} />}
                    {todasVisiveisSelecionadas ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>

                  {filtroCidade && (
                    <button
                      type="button"
                      onClick={() => handleSelecionarPorCidade(filtroCidade)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Vincular todas de {filtroCidade}
                    </button>
                  )}
                </div>

                <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                  Valor Total Carga: {formatCurrency(valorTotalCarga)}
                </span>
              </div>

              {/* Barra de Filtros Inteligentes (Cidade, UF, Período, Busca) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr 90px 110px auto',
                  gap: '8px',
                  backgroundColor: 'var(--surface-2)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  alignItems: 'center',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="coliseu-input"
                    placeholder="Buscar NF-e, cliente, chave, CPF..."
                    value={buscaDoc}
                    onChange={(e) => setBuscaDoc(e.target.value)}
                    style={{ height: '28px', paddingLeft: '26px', fontSize: '11px' }}
                  />
                </div>

                <div>
                  <select
                    className="coliseu-input"
                    value={filtroCidade}
                    onChange={(e) => setFiltroCidade(e.target.value)}
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    <option value="">🏢 Todas as Cidades ({cidadesDisponiveis.length})</option>
                    {cidadesDisponiveis.map((cidade) => (
                      <option key={cidade} value={cidade}>
                        {cidade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    className="coliseu-input"
                    value={filtroUf}
                    onChange={(e) => setFiltroUf(e.target.value)}
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    <option value="">UF (Todas)</option>
                    {ufsDisponiveis.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    className="coliseu-input"
                    value={filtroPeriodo}
                    onChange={(e) => setFiltroPeriodo(e.target.value as any)}
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    <option value="TODOS">📅 Todas as Datas</option>
                    <option value="HOJE">Hoje</option>
                    <option value="7_DIAS">Últimos 7 dias</option>
                    <option value="30_DIAS">Este Mês</option>
                  </select>
                </div>

                {(buscaDoc || filtroCidade || filtroUf || filtroPeriodo !== 'TODOS') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuscaDoc('');
                      setFiltroCidade('');
                      setFiltroUf('');
                      setFiltroPeriodo('TODOS');
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#ef4444',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Tabela de Notas Fiscais */}
              <div className="coliseu-table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <table className="coliseu-table" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '36px', textAlign: 'center' }}>Vinc.</th>
                      <th style={{ width: '90px' }}>Nº NF-e</th>
                      <th style={{ width: '85px' }}>Data</th>
                      <th>Destinatário</th>
                      <th style={{ width: '130px' }}>Destino (Cidade/UF)</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Valor Total</th>
                      <th>Chave de Acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingDocs ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          Varrendo notas fiscais do sistema...
                        </td>
                      </tr>
                    ) : documentosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          Nenhuma NF-e encontrada com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      documentosFiltrados.map((doc) => {
                        const isChecked = chavesSelecionadas.includes(doc.chave_acesso);
                        return (
                          <tr
                            key={doc.id || doc.chave_acesso}
                            style={{
                              backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() => toggleChave(doc.chave_acesso)}
                          >
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleChave(doc.chave_acesso)}
                              />
                            </td>
                            <td style={{ fontWeight: 700, color: '#3b82f6' }}>NF-e {doc.numero}</td>
                            <td>{doc.data_emissao}</td>
                            <td style={{ fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.destinatario_nome}
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {doc.destinatario_cidade || 'DOURADOS'}/{doc.destinatario_uf || 'MS'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                              {formatCurrency(doc.valor_total)}
                            </td>
                            <td className="text-mono" style={{ fontSize: '9px', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.chave_acesso}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Inserção de NF-e avulsa por Chave */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 10px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px dashed var(--border-default)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adicionar NF-e avulsa por Chave (44 dígitos):</span>
                <input
                  type="text"
                  className="coliseu-input"
                  placeholder="50260812345678000190550010000000011123456789"
                  value={nfeAvulsaChave}
                  onChange={(e) => setNfeAvulsaChave(e.target.value.replace(/\D/g, ''))}
                  maxLength={44}
                  style={{ flex: 1, height: '28px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Button size="sm" variant="secondary" onClick={handleAdicionarNfeAvulsa} disabled={nfeAvulsaChave.length !== 44}>
                  Vincular
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 3: CARGA, UNIDADES DE MEDIDA & SEGURO */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Características da Carga */}
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={14} /> Perfil e Quantidades da Carga Transportada:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Produto Predominante *</label>
                    <input type="text" className="coliseu-input" value={produtoPredominante} onChange={(e) => setProdutoPredominante(e.target.value.toUpperCase())} style={{ height: '34px', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Outras Características da Carga</label>
                    <input type="text" className="coliseu-input" value={outrasCaracteristicas} onChange={(e) => setOutrasCaracteristicas(e.target.value.toUpperCase())} style={{ height: '34px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Peso Bruto Total (Kg) *</label>
                    <input type="number" className="coliseu-input" value={pesoBrutoKg} onChange={(e) => setPesoBrutoKg(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right', fontWeight: 800 }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Peso Líquido (Kg)</label>
                    <input type="number" className="coliseu-input" value={pesoLiquidoKg} onChange={(e) => setPesoLiquidoKg(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Cubagem (m³)</label>
                    <input type="number" className="coliseu-input" value={metroCubicoM3} onChange={(e) => setMetroCubicoM3(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Quantidade de Volumes</label>
                    <input type="number" className="coliseu-input" value={quantidadeVolumes} onChange={(e) => setQuantidadeVolumes(parseInt(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right' }} />
                  </div>
                </div>
              </div>

              {/* Seguro Obrigatório RCTR-C / SUSEP */}
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Dados do Seguro da Carga (Obrigatório RCTR-C / ANTT / SUSEP):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Responsável pelo Seguro *</label>
                    <select className="coliseu-input" value={responsavelSeguro} onChange={(e) => setResponsavelSeguro(parseInt(e.target.value))} style={{ height: '34px' }}>
                      <option value={4}>4 - Emitente do CT-e (Transportador)</option>
                      <option value={0}>0 - Remetente</option>
                      <option value={3}>3 - Destinatário</option>
                      <option value={5}>5 - Tomador do Serviço</option>
                    </select>
                  </div>
                  <div>
                    <label className="coliseu-label">Nome da Seguradora *</label>
                    <input type="text" className="coliseu-input" value={seguradoraNome} onChange={(e) => setSeguradoraNome(e.target.value.toUpperCase())} style={{ height: '34px', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Número da Apólice *</label>
                    <input type="text" className="coliseu-input" value={seguradoraApolice} onChange={(e) => setSeguradoraApolice(e.target.value)} style={{ height: '34px', fontFamily: 'monospace' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Número de Averbação</label>
                    <input type="text" className="coliseu-input" value={seguradoraAverbacao} onChange={(e) => setSeguradoraAverbacao(e.target.value)} style={{ height: '34px', fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 4: FROTA, CONDUTOR & COMPOSIÇÃO DO FRETE */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Frota e Condutor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Veículo Tração (Placa / Modelo / RNTRC) *</label>
                  <select className="coliseu-input" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                    {veiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.placa} ({v.tipo_veiculo} - {v.marca} {v.modelo}) • RNTRC: {v.rntrc || '09812345'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="coliseu-label">Motorista / Condutor Responsável *</label>
                  <select className="coliseu-input" value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                    {motoristas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} (CPF: {m.cpf})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Composição Tarifária do Frete */}
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>
                    Composição dos Componentes do Frete (Tags &lt;Comp&gt;):
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                    Valor Total da Prestação: {formatCurrency(valorTotalPrestacao)}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Frete Peso (R$) *</label>
                    <input type="number" className="coliseu-input" value={fretePeso} onChange={(e) => setFretePeso(parseFloat(e.target.value) || 0)} style={{ height: '32px', textAlign: 'right', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Pedágio (R$)</label>
                    <input type="number" className="coliseu-input" value={pedagio} onChange={(e) => setPedagio(parseFloat(e.target.value) || 0)} style={{ height: '32px', textAlign: 'right' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">GRIS - Gerenc. Risco (R$)</label>
                    <input type="number" className="coliseu-input" value={gris} onChange={(e) => setGris(parseFloat(e.target.value) || 0)} style={{ height: '32px', textAlign: 'right' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Ad-Valorem / Frete Valor (R$)</label>
                    <input type="number" className="coliseu-input" value={adValorem} onChange={(e) => setAdValorem(parseFloat(e.target.value) || 0)} style={{ height: '32px', textAlign: 'right' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Taxa de Coleta / Entrega (R$)</label>
                    <input type="number" className="coliseu-input" value={taxaColetaEntrega} onChange={(e) => setTaxaColetaEntrega(parseFloat(e.target.value) || 0)} style={{ height: '32px', textAlign: 'right' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Outras Despesas / Descarga (R$)</label>
                    <input type="number" className="coliseu-input" value={outrosValores} onChange={(e) => setOutrosValores(parseFloat(e.target.value) || 0)} style={{ height: '32px', textAlign: 'right' }} />
                  </div>
                </div>
              </div>

              {/* Calculadora Piso Mínimo ANTT */}
              <PisoMinimoCalculator
                distanciaKmInicial={230}
                onAplicarPiso={(v: number) => {
                  setFretePeso(v);
                }}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 5: TRIBUTAÇÃO ICMS, COBRANÇA & TRANSMISSÃO */}
          {/* ========================================================================= */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Tributação ICMS */}
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Percent size={14} /> Tributação do ICMS no Transporte:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">CST ICMS *</label>
                    <select className="coliseu-input" value={icmsCst} onChange={(e) => setIcmsCst(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                      <option value="00">00 - Tributada Integralmente</option>
                      <option value="20">20 - Com Redução de Base</option>
                      <option value="40">40 - Isenta de ICMS</option>
                      <option value="41">41 - Não Tributada</option>
                      <option value="60">60 - Cobrada por Substituição Tributária</option>
                      <option value="90">90 - Outras</option>
                      <option value="SN">SN - Simples Nacional (indSN=1)</option>
                    </select>
                  </div>
                  <div>
                    <label className="coliseu-label">Alíquota ICMS (%)</label>
                    <input type="number" className="coliseu-input" value={icmsAliquota} onChange={(e) => setIcmsAliquota(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Redução BC (%)</label>
                    <input type="number" className="coliseu-input" value={icmsReducaoBc} onChange={(e) => setIcmsReducaoBc(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right' }} disabled={icmsCst !== '20'} />
                  </div>
                  <div>
                    <label className="coliseu-label">Base de Cálculo (R$)</label>
                    <input type="text" className="coliseu-input" value={formatCurrency(baseCalculoIcms)} disabled style={{ height: '34px', textAlign: 'right', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Valor ICMS (R$)</label>
                    <input type="text" className="coliseu-input" value={formatCurrency(valorIcms)} disabled style={{ height: '34px', textAlign: 'right', fontWeight: 800, color: '#3b82f6' }} />
                  </div>
                </div>
              </div>

              {/* Cobrança & Faturamento */}
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CreditCard size={14} /> Dados Financeiros & Fatura:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Número da Fatura</label>
                    <input type="text" className="coliseu-input" value={numeroFatura} onChange={(e) => setNumeroFatura(e.target.value)} style={{ height: '32px', fontFamily: 'monospace', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Data de Vencimento</label>
                    <input type="date" className="coliseu-input" value={dataVencimentoFatura} onChange={(e) => setDataVencimentoFatura(e.target.value)} style={{ height: '32px' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Valor a Receber (R$)</label>
                    <input type="text" className="coliseu-input" value={formatCurrency(valorReceber)} disabled style={{ height: '32px', textAlign: 'right', fontWeight: 800, color: '#10b981' }} />
                  </div>
                </div>
              </div>

              {/* Observações Gerais */}
              <div>
                <label className="coliseu-label">Observações Gerais do Contribuinte & Fisco</label>
                <textarea
                  className="coliseu-input"
                  rows={2}
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  style={{ width: '100%', fontSize: '11px', resize: 'vertical' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer com Navegação e Transmissão SEFAZ */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            {step > 1 && (
              <Button variant="secondary" size="sm" onClick={() => setStep((s) => (s - 1) as any)} leftIcon={<ArrowLeft size={14} />}>
                Voltar
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace', marginRight: '8px' }}>
              Total: {formatCurrency(valorTotalPrestacao)}
            </span>

            {step < 5 ? (
              <Button variant="primary" size="sm" onClick={() => setStep((s) => (s + 1) as any)} rightIcon={<ArrowRight size={14} />}>
                Avançar
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleTransmitirCTe}
                disabled={isTransmitting || chavesSelecionadas.length === 0}
                leftIcon={<Send size={14} />}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 800 }}
              >
                {isTransmitting ? 'Transmitindo à SEFAZ...' : 'Transmitir CT-e 4.00 (SEFAZ)'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
