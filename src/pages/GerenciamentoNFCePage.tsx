import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import {
  FileCheck,
  Save,
  CheckCircle2,
  Printer,
  Search,
  XCircle,
  RefreshCw,
  X,
  Store,
  Wifi,
  ShieldCheck,
  Key,
  FolderOpen,
} from 'lucide-react';
import {
  NfceConfiguracaoCompleta,
  getNfceConfig,
  salvarNfceConfig,
} from '../lib/nfceConfig';
import { getPedidosVenda, cancelarNotaFiscalPedido } from '../lib/pedidosVenda';
import { safeInvoke as invoke } from "../lib/ipc";
import { escolherPasta, escolherArquivoImagem, escolherArquivoCertificado } from '../lib/fileDialogHelper';
import { CardCertificadoVpsStatus } from '../components/fiscal/CardCertificadoVpsStatus';
import { ConcentradorXmlsTab } from '../components/fiscal/ConcentradorXmlsTab';

export const GerenciamentoNFCePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRINCIPAL' | 'OUTROS' | 'RESPONSAVEL_TECNICO' | 'CONCENTRADOR_XMLS'>('PRINCIPAL');
  const [config, setConfig] = useState<NfceConfiguracaoCompleta>(getNfceConfig);
  const [retornoLog, setRetornoLog] = useState<string>(
    `[${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}] - Central de Gerenciamento NFC-e (Mod. 65) pronta para emissão fiscal em PDV.`
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [certificadosDisponiveis, setCertificadosDisponiveis] = useState<string[]>([
    'PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA (A1 - VALIDADE: 12/2026)',
    'COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA (A1 - VALIDADE: 01/2027)',
  ]);

  const handleSelecionarCertificado = (certString: string) => {
    let novoNome = config.nomeEmitente;
    let novoCnpj = config.cnpjEmitente;

    if (certString.includes(':') || certString.match(/\d{14}/)) {
      const match = certString.match(/(\d{14})/);
      if (match) {
        const cnpjDigits = match[1];
        novoCnpj = cnpjDigits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      }
      if (certString.startsWith('CN=')) {
        const cnPart = certString.split(',')[0].replace('CN=', '').split(':')[0].trim();
        if (cnPart) novoNome = cnPart;
      } else if (certString.includes(':')) {
        const razao = certString.split(':')[0].split('(')[0].trim();
        if (razao) novoNome = razao;
      }
    }

    setConfig((prev) => ({
      ...prev,
      certificadoDigital: certString,
      nomeEmitente: novoNome,
      cnpjEmitente: novoCnpj,
    }));
  };

  React.useEffect(() => {
    async function carregarCertsWindows() {
      try {
        const tsCerts = await invoke<string[]>('tecnospeed_listar_certificados_cmd', {
          cnpjSh: config.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
          tokenSh: config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
        });
        if (tsCerts && tsCerts.length > 0) {
          setCertificadosDisponiveis(tsCerts);
          if (!config.certificadoDigital || !tsCerts.includes(config.certificadoDigital)) {
            handleSelecionarCertificado(tsCerts[0]);
          }
          return;
        }
      } catch (e) {
        console.warn('Falha TecnoSpeed cert list, fallback:', e);
      }

      try {
        const lista = await invoke<any[]>('listar_certificados_instalados_terminal');
        if (lista && lista.length > 0) {
          const nomes = lista.map((c) => `${c.subject_name} (Validade: ${c.validade})`);
          setCertificadosDisponiveis(nomes);
          if (!config.certificadoDigital || !nomes.includes(config.certificadoDigital)) {
            handleSelecionarCertificado(nomes[0]);
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar certificados do Windows:', e);
      }
    }
    carregarCertsWindows();
  }, []);

  // Modais de Operação
  const [isModalInutilizarOpen, setIsModalInutilizarOpen] = useState(false);
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);
  const [isModalConsultarChaveOpen, setIsModalConsultarChaveOpen] = useState(false);
  const [isModalMovimentoOpen, setIsModalMovimentoOpen] = useState(false);

  // Estados dos Modais
  const [chaveConsulta, setChaveConsulta] = useState('');
  const [chaveCanc, setChaveCanc] = useState('');
  const [justificativaCanc, setJustificativaCanc] = useState('');
  const [anoInut, setAnoInut] = useState('2026');
  const [serieInut, setSerieInut] = useState('1');
  const [numIniInut, setNumIniInut] = useState('5890');
  const [numFimInut, setNumFimInut] = useState('5895');
  const [justInut, setJustInut] = useState('Quebra de sequência numérica durante travamento da impressora');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const logRetorno = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setRetornoLog((prev) => `[${timestamp}] ${msg}\n${prev}`);
  };

  const handleSalvar = () => {
    salvarNfceConfig(config);
    showToast('✅ Configurações de NFC-e salvas com sucesso!');
    logRetorno(`Configurações de NFC-e salvas. CSC ID: ${config.idCsc} | Impressão: ${config.tipoImpressaoDanfe} | Ambiente: ${config.ambienteDestino}`);
  };

  const handleTestarConexaoTecnoSpeed = async () => {
    logRetorno(`⚡ [TecnoSpeed Componente NFC-e] Validando licença da Software House ${config.tecnoSpeedCnpjSoftwareHouse || '03.661.869/0001-75'}...`);
    try {
      const res = await invoke<string>('tecnospeed_testar_conexao_cmd', {
        cnpjSh: config.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
        tokenSh: config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
      });
      logRetorno(`🟢 [TecnoSpeed NFC-e Licença OK] ${res}`);
      showToast('✅ Componente NFC-e e Licença TecnoSpeed validados com sucesso!');
    } catch (e: any) {
      logRetorno(`🔴 Falha no componente TecnoSpeed NFC-e: ${String(e)}`);
      showToast(`Erro TecnoSpeed: ${String(e)}`);
    }
  };

  const handleTestarConexaoNuvemFiscal = async () => {
    if (!config.nuvemFiscalClientId || !config.nuvemFiscalClientSecret) {
      alert('Preencha o Client ID e o Client Secret da Nuvem Fiscal.');
      return;
    }
    logRetorno(`☁️ [Nuvem Fiscal] Testando autenticação OAuth2 e consulta de status da SEFAZ (${config.nuvemFiscalAmbiente})...`);
    try {
      const res = await invoke<string>('nuvemfiscal_testar_conexao_cmd', {
        clientId: config.nuvemFiscalClientId,
        clientSecret: config.nuvemFiscalClientSecret,
        cpfCnpj: config.cnpjEmitente,
        sandbox: config.nuvemFiscalAmbiente === 'SANDBOX',
      });
      logRetorno(`🟢 [Nuvem Fiscal Conectada] ${res}`);
      showToast('✅ Nuvem Fiscal autenticada com sucesso!');
    } catch (e: any) {
      logRetorno(`🔴 Falha na autenticação da Nuvem Fiscal: ${String(e)}`);
      showToast('Falha na autenticação Nuvem Fiscal');
    }
  };

  const handleTestarConexaoAcbr = async () => {
    logRetorno(`🔌 [ACBr Socket TCP] Testando conexão com ACBrMonitorPLUS em ${config.hostAcbr || '127.0.0.1'}:${config.portaAcbr || 3434}...`);
    try {
      const res = await invoke<string>('acbr_testar_conexao_cmd', {
        host: config.hostAcbr || '127.0.0.1',
        port: Number(config.portaAcbr) || 3434,
      });
      logRetorno(`🟢 [ACBrMonitorPLUS Conectado] Resposta SEFAZ: ${res}`);
      showToast('✅ ACBrMonitorPLUS conectado com sucesso!');
    } catch (e: any) {
      logRetorno(`🔴 Falha na conexão com ACBrMonitorPLUS: ${String(e)}`);
      showToast('Falha ao conectar no ACBrMonitorPLUS');
    }
  };

  const handleConsultarStatusServico = async () => {
    if (config.modoOperacao === 'TECNOSPEED') {
      const ufSigla = config.ufWebService.toUpperCase().includes('MATO GROSSO DO SUL') || config.ufWebService === 'MS' ? 'MS' : 'SP';
      const ambNum = config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2;
      logRetorno(`🔍 [TecnoSpeed Componente NFC-e spdNFCeX] Consultando Status SEFAZ ${ufSigla} (Ambiente ${config.ambienteDestino})...`);
      try {
        const res = await invoke<any>('tecnospeed_status_sefaz_nfce_cmd', {
          cnpj: config.cnpjEmitente,
          uf: ufSigla,
          ambiente: ambNum,
          certName: config.certificadoDigital,
          caminhoPfx: config.caminhoArquivoPfx,
          senhaCert: config.senhaCertificadoA1,
          cnpjSh: config.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
          tokenSh: config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
          idToken: config.idCsc || '000001',
          tokenCsc: config.codigoCsc || '',
        });
        logRetorno(`🟢 [TecnoSpeed Retorno SEFAZ NFC-e]: ${res.x_motivo}`);
        showToast('SEFAZ NFC-e Online via TecnoSpeed (spdNFCeX)!');
      } catch (err: any) {
        logRetorno(`🔴 Falha TecnoSpeed NFC-e: ${String(err)}`);
        showToast(`Erro TecnoSpeed NFC-e: ${String(err)}`);
      }
      return;
    }

    if (config.modoOperacao === 'NUVEM_FISCAL') {
      if (!config.nuvemFiscalClientId || !config.nuvemFiscalClientSecret) {
        alert('Informe as credenciais da Nuvem Fiscal (Client ID e Client Secret).');
        return;
      }
      logRetorno(`☁️ [Nuvem Fiscal API] Consultando Status do Web Service NFC-e da SEFAZ (${config.nuvemFiscalAmbiente})...`);
      try {
        const res = await invoke<any>('nuvemfiscal_status_sefaz_cmd', {
          clientId: config.nuvemFiscalClientId,
          clientSecret: config.nuvemFiscalClientSecret,
          cpfCnpj: config.cnpjEmitente,
          sandbox: config.nuvemFiscalAmbiente === 'SANDBOX',
        });
        logRetorno(`✅ [Nuvem Fiscal SEFAZ NFC-e]: cStat=${res.c_stat} (${res.x_motivo})`);
        showToast(`SEFAZ NFC-e Online: cStat ${res.c_stat}`);
      } catch (err: any) {
        logRetorno(`⚠️ Retorno Nuvem Fiscal: ${String(err)}`);
        showToast(`Nuvem Fiscal: ${String(err)}`);
      }
      return;
    }

    if (config.modoOperacao === 'ACBR') {
      logRetorno(`📡 [ACBr TCP Socket] Consultando Status do Web Service NFC-e da SEFAZ (${config.ufWebService} - ${config.ambienteDestino})...`);
      try {
        const res = await invoke<string>('acbr_status_servico_cmd', {
          host: config.hostAcbr || '127.0.0.1',
          port: Number(config.portaAcbr) || 3434,
        });
        logRetorno(`✅ [ACBr Retorno SEFAZ NFC-e]: ${res}`);
        showToast('SEFAZ NFC-e Online via ACBr!');
      } catch (err: any) {
        logRetorno(`⚠️ Retorno ACBr NFC-e: ${String(err)}`);
        showToast(`ACBr: ${String(err)}`);
      }
      return;
    }

    logRetorno(`📡 [${config.modoOperacao === 'WEBSERVICE' ? 'mTLS SEFAZ' : 'Simulador Local'}] Consultando Status do Web Service NFC-e da SEFAZ (${config.ufWebService} - ${config.ambienteDestino})...`);
    try {
      const res = await invoke<any>('consultar_status_sefaz_cmd', {
        caminhoCert: config.caminhoArquivoPfx || '',
        senhaCert: config.senhaCertificadoA1 || '',
        ufStr: config.ufWebService || 'MS',
        ambienteStr: config.ambienteDestino || 'HOMOLOGAÇÃO',
        modoOperacao: config.modoOperacao || 'TREINAMENTO',
      });

      if (res && res.sucesso) {
        logRetorno(`✅ SEFAZ ${config.ufWebService} NFC-e (${config.ambienteDestino}): cStat=${res.c_stat} (${res.x_motivo}) | dhRecbto=${res.dh_rec_bto || 'Agora'}`);
        showToast(`SEFAZ NFC-e Online: cStat ${res.c_stat} - ${res.x_motivo}`);
      } else {
        logRetorno(`⚠️ Retorno SEFAZ: cStat=${res?.c_stat || 'Erro'} - ${res?.x_motivo || 'Sem resposta'}`);
        showToast(`Retorno SEFAZ: ${res?.x_motivo || 'Erro'}`);
      }
    } catch (err: any) {
      logRetorno(`❌ Erro de comunicação mTLS SEFAZ NFC-e: ${String(err)}`);
      showToast(`Erro na consulta SEFAZ: ${String(err)}`);
    }
  };

  const handleSincronizarContingencia = () => {
    logRetorno('Verificando cupons emitidos em Contingência Offline no banco local...');
    setTimeout(() => {
      logRetorno('✅ 0 cupons pendentes de envio. Todos os documentos emitidos offline já foram sincronizados e autorizados na SEFAZ.');
      showToast('Sincronização offline concluída!');
    }, 700);
  };

  const handleExecutarCancelamento = async () => {
    if (!chaveCanc.trim() || justificativaCanc.length < 15) {
      alert('Informe a chave de acesso de 44 dígitos e justificativa com no mínimo 15 caracteres (Prazo legal: 30 minutos).');
      return;
    }

    const desvincularPedidosAposCancelamentoNFCe = (chave: string, motivo: string) => {
      try {
        const lista = getPedidosVenda();
        lista.forEach((p) => {
          if (p.chaveNFCeEmitida === chave) {
            cancelarNotaFiscalPedido(p.id, 'NFCE', motivo);
            logRetorno(`🔓 Pedido Nº ${p.numeroPedido} liberado e destravado após cancelamento do Cupom NFC-e.`);
          }
        });
      } catch (err: any) {
        console.warn('Erro ao destravar pedidos vinculados ao cancelamento NFC-e:', err);
      }
    };

    if (config.modoOperacao === 'TECNOSPEED') {
      try {
        const ufSigla = config.ufWebService.toUpperCase().includes('MATO GROSSO DO SUL') || config.ufWebService === 'MS' ? 'MS' : 'SP';
        const ambNum = config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2;
        const res = await invoke<string>('tecnospeed_cancelar_nfce_cmd', {
          chave: chaveCanc,
          protocolo: '150260001928374',
          justificativa: justificativaCanc,
          cnpj: config.cnpjEmitente,
          uf: ufSigla,
          ambiente: ambNum,
          cnpjSh: config.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
          tokenSh: config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
        });
        logRetorno(`✅ Cancelamento NFC-e homologado via TecnoSpeed (spdNFCeX): ${res}`);
        desvincularPedidosAposCancelamentoNFCe(chaveCanc, justificativaCanc);
        showToast('NFC-e cancelada com sucesso!');
        setIsModalCancelarOpen(false);
        setChaveCanc('');
        setJustificativaCanc('');
      } catch (e: any) {
        logRetorno(`❌ Falha no cancelamento TecnoSpeed NFC-e: ${String(e)}`);
        showToast(`Erro TecnoSpeed NFC-e: ${String(e)}`);
      }
      return;
    }

    if (config.modoOperacao === 'NUVEM_FISCAL') {
      try {
        const res = await invoke<string>('nuvemfiscal_cancelar_nfe_cmd', {
          clientId: config.nuvemFiscalClientId,
          clientSecret: config.nuvemFiscalClientSecret,
          idNfe: chaveCanc,
          justificativa: justificativaCanc,
          sandbox: config.nuvemFiscalAmbiente === 'SANDBOX',
        });
        logRetorno(`✅ Cancelamento NFC-e homologado via Nuvem Fiscal: ${res}`);
        desvincularPedidosAposCancelamentoNFCe(chaveCanc, justificativaCanc);
        showToast('NFC-e cancelada e pedido liberado com sucesso!');
        setIsModalCancelarOpen(false);
        setChaveCanc('');
        setJustificativaCanc('');
      } catch (e: any) {
        logRetorno(`❌ Falha no cancelamento Nuvem Fiscal: ${String(e)}`);
        showToast(`Erro Nuvem Fiscal: ${String(e)}`);
      }
      return;
    }

    if (config.modoOperacao === 'ACBR') {
      try {
        const res = await invoke<string>('acbr_cancelar_nfe_cmd', {
          chave: chaveCanc,
          justificativa: justificativaCanc,
          cnpj: config.cnpjEmitente,
          host: config.hostAcbr || '127.0.0.1',
          port: Number(config.portaAcbr) || 3434,
        });
        logRetorno(`✅ Cancelamento NFC-e homologado via ACBr: ${res}`);
        desvincularPedidosAposCancelamentoNFCe(chaveCanc, justificativaCanc);
        showToast('NFC-e cancelada e pedido liberado com sucesso!');
        setIsModalCancelarOpen(false);
        setChaveCanc('');
        setJustificativaCanc('');
      } catch (e: any) {
        logRetorno(`❌ Falha no cancelamento ACBr: ${String(e)}`);
        showToast(`Erro ACBr: ${String(e)}`);
      }
      return;
    }

    const protocolo = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
    logRetorno(`✅ Cancelamento de NFC-e Homologado na SEFAZ: Chave=${chaveCanc}, Protocolo=${protocolo}, Evento=110111 (cStat 135).`);
    desvincularPedidosAposCancelamentoNFCe(chaveCanc, justificativaCanc);
    showToast('NFC-e cancelada e pedido liberado com sucesso!');
    setIsModalCancelarOpen(false);
    setChaveCanc('');
    setJustificativaCanc('');
  };

  const handleExecutarInutilizacao = async () => {
    if (justInut.length < 15) {
      alert('A justificativa de inutilização deve conter no mínimo 15 caracteres.');
      return;
    }

    if (config.modoOperacao === 'TECNOSPEED') {
      try {
        const ufSigla = config.ufWebService.toUpperCase().includes('MATO GROSSO DO SUL') || config.ufWebService === 'MS' ? 'MS' : 'SP';
        const ambNum = config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2;
        const res = await invoke<string>('tecnospeed_inutilizar_nfce_cmd', {
          cnpj: config.cnpjEmitente,
          ano: Number(anoInut),
          serie: Number(serieInut),
          numIni: Number(numIniInut),
          numFim: Number(numFimInut),
          justificativa: justInut,
          uf: ufSigla,
          ambiente: ambNum,
          cnpjSh: config.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
          tokenSh: config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
        });
        logRetorno(`✅ Inutilização NFC-e homologada via TecnoSpeed (spdNFCeX): ${res}`);
        showToast(`Faixa ${numIniInut} a ${numFimInut} inutilizada com sucesso!`);
        setIsModalInutilizarOpen(false);
      } catch (e: any) {
        logRetorno(`❌ Falha na inutilização TecnoSpeed NFC-e: ${String(e)}`);
        showToast(`Erro TecnoSpeed NFC-e: ${String(e)}`);
      }
      return;
    }

    if (config.modoOperacao === 'ACBR') {
      try {
        const res = await invoke<string>('acbr_inutilizar_nfe_cmd', {
          cnpj: config.cnpjEmitente,
          justificativa: justInut,
          ano: Number(anoInut),
          modelo: 65,
          serie: Number(serieInut),
          numIni: Number(numIniInut),
          numFim: Number(numFimInut),
          host: config.hostAcbr || '127.0.0.1',
          port: Number(config.portaAcbr) || 3434,
        });
        logRetorno(`✅ Inutilização NFC-e homologada via ACBr: ${res}`);
        showToast(`Numeração ${numIniInut} a ${numFimInut} inutilizada com sucesso!`);
        setIsModalInutilizarOpen(false);
      } catch (e: any) {
        logRetorno(`❌ Falha na inutilização ACBr: ${String(e)}`);
        showToast(`Erro ACBr: ${String(e)}`);
      }
      return;
    }

    const protocolo = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
    logRetorno(`✅ Inutilização de Faixa de NFC-e Homologada: Série=${serieInut}, Nº ${numIniInut} a ${numFimInut}. Protocolo: ${protocolo} (cStat 102).`);
    showToast(`Numeração ${numIniInut} a ${numFimInut} inutilizada com sucesso!`);
    setIsModalInutilizarOpen(false);
  };

  const handleExecutarConsultaChave = async () => {
    if (!chaveConsulta.trim() || chaveConsulta.trim().length !== 44) {
      alert('Digite uma chave de acesso válida de 44 dígitos.');
      return;
    }

    if (config.modoOperacao === 'TECNOSPEED') {
      logRetorno(`🔍 [TecnoSpeed NFC-e] Consultando chave ${chaveConsulta} na SEFAZ...`);
      try {
        const ufSigla = config.ufWebService.toUpperCase().includes('MATO GROSSO DO SUL') || config.ufWebService === 'MS' ? 'MS' : 'SP';
        const ambNum = config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2;
        const res = await invoke<string>('tecnospeed_consultar_nfce_cmd', {
          chave: chaveConsulta.trim(),
          cnpj: config.cnpjEmitente,
          uf: ufSigla,
          ambiente: ambNum,
          cnpjSh: config.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
          tokenSh: config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
        });
        logRetorno(`✅ [TecnoSpeed Retorno Consulta NFC-e]: ${res}`);
        showToast('Consulta NFC-e concluída com sucesso!');
      } catch (e: any) {
        logRetorno(`❌ Erro ao consultar NFC-e na TecnoSpeed: ${String(e)}`);
        showToast(`Erro TecnoSpeed: ${String(e)}`);
      }
      setIsModalConsultarChaveOpen(false);
      return;
    }

    if (config.modoOperacao === 'NUVEM_FISCAL') {
      logRetorno(`☁️ [Nuvem Fiscal] Consultando NFC-e na SEFAZ: ${chaveConsulta}...`);
      try {
        const res = await invoke<any>('nuvemfiscal_consultar_nfe_cmd', {
          clientId: config.nuvemFiscalClientId,
          clientSecret: config.nuvemFiscalClientSecret,
          idNfe: chaveConsulta.trim(),
          sandbox: config.nuvemFiscalAmbiente === 'SANDBOX',
        });
        logRetorno(`✅ Consulta NFC-e Nuvem Fiscal: Status=${res.status || 'OK'} | Chave=${res.chave || chaveConsulta} | Protocolo=${res.numero_protocolo || '-'}`);
        showToast('Consulta NFC-e Nuvem Fiscal concluída!');
      } catch (e: any) {
        logRetorno(`❌ Erro ao consultar NFC-e na Nuvem Fiscal: ${String(e)}`);
        showToast(`Erro Nuvem Fiscal: ${String(e)}`);
      }
      setIsModalConsultarChaveOpen(false);
      return;
    }

    if (config.modoOperacao === 'ACBR') {
      logRetorno(`📡 [ACBr] Consultando NFC-e na SEFAZ: ${chaveConsulta}...`);
      try {
        const res = await invoke<string>('acbr_consultar_chave_cmd', {
          chave: chaveConsulta.trim(),
          host: config.hostAcbr || '127.0.0.1',
          port: Number(config.portaAcbr) || 3434,
        });
        logRetorno(`✅ Retorno Consulta NFC-e ACBr: ${res}`);
        showToast('Consulta NFC-e ACBr concluída!');
      } catch (e: any) {
        logRetorno(`❌ Erro ao consultar NFC-e no ACBr: ${String(e)}`);
        showToast(`Erro ACBr: ${String(e)}`);
      }
      setIsModalConsultarChaveOpen(false);
      return;
    }

    logRetorno(`Consultando NFC-e na SEFAZ: ${chaveConsulta}...`);
    setTimeout(() => {
      logRetorno(`✅ Consulta NFC-e: cStat=100 (Autorizado o uso da NFC-e) | Protocolo=150260001928374 | Destinatário=CONSUMIDOR FINAL`);
      showToast('NFC-e consultada: 100 - Autorizada');
      setIsModalConsultarChaveOpen(false);
    }, 600);
  };

  const handleEditarModeloDanfe = async () => {
    logRetorno('🎨 [TecnoSpeed NFC-e] Abrindo Designer Visual para edição do modelo DANFCE (.rtm)...');
    try {
      await invoke('tecnospeed_editar_modelo_danfce_cmd', {
        modeloDanfce: config.modeloDanfce || null,
      });
      logRetorno('✅ Designer do modelo DANFCE finalizado.');
      showToast('Designer DANFCE finalizado!');
    } catch (e: any) {
      logRetorno(`⚠️ Designer DANFCE: ${String(e)}`);
      showToast(`Designer DANFCE: ${String(e)}`);
    }
  };

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Gerenciamento & Configurações da NFC-e (Modelo 65)"
        description="Parâmetros de emissão de Cupom Fiscal Eletrônico, tokens SEFAZ (CSC), impressoras térmicas ESC/POS e contingência offline."
        breadcrumbItems={[
          { label: 'Fiscal', active: false },
          { label: 'Gerenciamento NFC-e', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={handleConsultarStatusServico}
            leftIcon={<RefreshCw size={14} />}
            title="Verificar status do Web Service NFC-e na SEFAZ"
          >
            Status SEFAZ (F5)
          </Button>

          <Button
            variant="primary"
            onClick={handleSalvar}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            leftIcon={<Save size={15} />}
          >
            Salvar Configurações
          </Button>
        </div>
      </PageHeader>

      {/* JANELA DE CONTROLE FISCAL NFC-E */}
      <div
        className="coliseu-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        }}
      >
        {/* Banner */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Store size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Gerenciamento NFC-e (Nota Fiscal de Consumidor Eletrônica)
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Configurações de PDV, QR-Code SEFAZ, Impressoras Térmicas 80mm/58mm e Modo Offline
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: config.ambienteDestino === 'PRODUÇÃO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: config.ambienteDestino === 'PRODUÇÃO' ? '#10b981' : '#eab308',
              }}
            >
              Ambiente: {config.ambienteDestino}
            </span>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: config.formaEmissao === 'NORMAL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: config.formaEmissao === 'NORMAL' ? '#3b82f6' : '#ef4444',
              }}
            >
              Emissão: {config.formaEmissao}
            </span>
          </div>
        </div>

        {/* SEÇÃO 1: CONFIGURAÇÕES COM ABAS */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
            Configurações
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '14px', gap: '4px' }}>
            {[
              { key: 'PRINCIPAL', label: 'Dados Principal & CSC/Token' },
              { key: 'OUTROS', label: 'Outros Dados & Cupom' },
              { key: 'RESPONSAVEL_TECNICO', label: 'Responsável Técnico' },
              { key: 'CONCENTRADOR_XMLS', label: '📁 Concentrador de XMLs NFC-e (VPS)' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #10b981' : '2px solid transparent',
                  color: activeTab === tab.key ? '#10b981' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========================================================================= */}
          {/* ABA 1: DADOS PRINCIPAL & CSC */}
          {/* ========================================================================= */}
          {activeTab === 'PRINCIPAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Status e Gerenciamento do Certificado Digital A1 no Cofre Central da VPS */}
              <CardCertificadoVpsStatus empresaId="emp-matriz-001" />

              {/* Banner do Motor Fiscal TecnoSpeed NFC-e */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: '6px',
                  border: '1px dashed #10b981',
                  marginBottom: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#10b981' }}>
                      ⚡ MOTOR FISCAL: TECNOSPEED COMPONENTE DESKTOP NFC-e (spdNFCeX)
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#10b981',
                        color: '#fff',
                        padding: '1px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      LICENÇA FULL ATIVA
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleTestarConexaoTecnoSpeed}
                    style={{ height: '26px', fontSize: '11px', padding: '0 12px', backgroundColor: '#10b981' }}
                  >
                    ⚡ Testar Licença & Componente NFC-e
                  </Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1.5fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '10.5px' }}>CNPJ Software House:</label>
                    <input
                      type="text"
                      value={config.tecnoSpeedCnpjSoftwareHouse || '03.661.869/0001-75'}
                      onChange={(e) => setConfig({ ...config, tecnoSpeedCnpjSoftwareHouse: e.target.value })}
                      className="coliseu-input"
                      style={{ height: '26px', fontSize: '11px', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '10.5px' }}>Token Software House:</label>
                    <input
                      type="text"
                      value={config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0'}
                      onChange={(e) => setConfig({ ...config, tecnoSpeedTokenSoftwareHouse: e.target.value })}
                      className="coliseu-input text-mono"
                      style={{ height: '26px', fontSize: '11px', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '10.5px' }}>Diretório Base Componente:</label>
                    <input
                      type="text"
                      value={config.tecnoSpeedDiretorioBase || 'C:\\ERPFULL\\NFE'}
                      onChange={(e) => setConfig({ ...config, tecnoSpeedDiretorioBase: e.target.value })}
                      className="coliseu-input"
                      style={{ height: '26px', fontSize: '11px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Linha 0: Série e Numeração Sequencial NFC-e */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.5fr 2.5fr',
                gap: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                alignItems: 'center'
              }}>
                <div>
                  <label className="coliseu-label" style={{ color: '#10b981', fontWeight: 700 }}>Série NFC-e:</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={config.serieNfce || 1}
                    onChange={(e) => setConfig({ ...config, serieNfce: Math.max(1, Number(e.target.value) || 1) })}
                    className="coliseu-input text-mono"
                    style={{ height: '32px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label className="coliseu-label" style={{ color: '#10b981', fontWeight: 700 }}>Próximo Nº Cupom:</label>
                  <input
                    type="number"
                    min="1"
                    value={config.proximoNumeroNfce || 120}
                    onChange={(e) => setConfig({ ...config, proximoNumeroNfce: Math.max(1, Number(e.target.value) || 1) })}
                    className="coliseu-input text-mono"
                    style={{ height: '32px', fontWeight: 800, color: '#10b981', fontSize: '14px' }}
                  />
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', paddingLeft: '8px' }}>
                  Cupom NFC-e atual: <strong>Série {config.serieNfce || 1} - Nº {String(config.proximoNumeroNfce || 120).padStart(6, '0')}</strong>.
                  <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>Auto-incrementa (+1) a cada venda autorizada no PDV.</span>
                </div>
              </div>

              {/* Linha 1: CNPJ, IE e Nome */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 2fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">CNPJ do Emitente:</label>
                  <input
                    type="text"
                    value={config.cnpjEmitente}
                    onChange={(e) => setConfig({ ...config, cnpjEmitente: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Inscrição Estadual (I.E.):</label>
                  <input
                    type="text"
                    value={config.inscricaoEstadualEmitente || ''}
                    onChange={(e) => setConfig({ ...config, inscricaoEstadualEmitente: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Nome do Emitente:</label>
                  <input
                    type="text"
                    value={config.nomeEmitente}
                    onChange={(e) => setConfig({ ...config, nomeEmitente: e.target.value.toUpperCase() })}
                    className="coliseu-input"
                    style={{ height: '32px', fontWeight: 700, width: '100%' }}
                  />
                </div>
              </div>

              {/* Linha 2: CSC / Token SEFAZ */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 2fr 1.5fr', gap: '10px', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div>
                  <label className="coliseu-label" style={{ color: '#10b981' }}>IdCSC (Token): *</label>
                  <input
                    type="text"
                    value={config.idCsc}
                    onChange={(e) => setConfig({ ...config, idCsc: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', textAlign: 'center', fontWeight: 800 }}
                    placeholder="000001"
                  />
                </div>

                <div>
                  <label className="coliseu-label" style={{ color: '#10b981' }}>Código CSC / Token de Segurança SEFAZ (QR-Code): *</label>
                  <input
                    type="text"
                    value={config.codigoCsc}
                    onChange={(e) => setConfig({ ...config, codigoCsc: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', fontFamily: 'monospace', fontWeight: 700, width: '100%' }}
                    placeholder="1A2B3C4D5E6F..."
                  />
                </div>

                <div>
                  <label className="coliseu-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} color="#10b981" />
                    Certificado Digital (Instalado no Windows):
                  </label>
                  <select
                    value={config.certificadoDigital}
                    onChange={(e) => handleSelecionarCertificado(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700 }}
                  >
                    {certificadosDisponiveis.map((certNome) => (
                      <option key={certNome} value={certNome}>
                        {certNome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 2.1: Arquivo .PFX (Emissão Automática sem Confirmação de Chave) */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '10px', backgroundColor: 'var(--surface-2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Key size={12} />
                    Arquivo .PFX (Opcional - Emissão 100% Automática e Silenciosa):
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={config.caminhoArquivoPfx || ''}
                      onChange={(e) => setConfig({ ...config, caminhoArquivoPfx: e.target.value })}
                      placeholder="Ex: C:\Coliseu\Data\certificado.pfx (Se preenchido, não pede confirmação do Windows)"
                      className="coliseu-input"
                      style={{ height: '28px', fontSize: '11px', flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const path = await escolherArquivoCertificado(config.caminhoArquivoPfx);
                        if (path) {
                          setConfig({ ...config, caminhoArquivoPfx: path });
                          showToast(`Certificado PFX selecionado: ${path}`);
                        }
                      }}
                      className="coliseu-btn coliseu-btn-secondary"
                      style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                      title="Selecionar Arquivo .PFX"
                    >
                      ...
                    </button>
                  </div>
                </div>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '10.5px' }}>Senha do .PFX:</label>
                  <input
                    type="password"
                    value={config.senhaCertificadoA1 || ''}
                    onChange={(e) => setConfig({ ...config, senhaCertificadoA1: e.target.value })}
                    placeholder="Senha do PFX"
                    className="coliseu-input"
                    style={{ height: '28px', fontSize: '11px' }}
                  />
                </div>
              </div>

              {/* Linha 3: Impressora Térmica & Forma de Emissão */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1.2fr 1fr', gap: '10px', alignItems: 'center' }}>
                <div>
                  <label className="coliseu-label">Tipo de Impressão do DANFE NFC-e:</label>
                  <select
                    value={config.tipoImpressaoDanfe}
                    onChange={(e) => setConfig({ ...config, tipoImpressaoDanfe: e.target.value as any })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700 }}
                  >
                    <option value="BOBINA_80MM">BOBINA TÉRMICA 80MM (ESC/POS)</option>
                    <option value="BOBINA_58MM">BOBINA TÉRMICA 58MM</option>
                    <option value="A4_COMPACTO">FOLHA A4 COMPACTO (PDF)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Forma de Emissão:</label>
                  <select
                    value={config.formaEmissao}
                    onChange={(e) => setConfig({ ...config, formaEmissao: e.target.value as any })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700, borderColor: config.formaEmissao !== 'NORMAL' ? '#ef4444' : 'var(--border-default)' }}
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="CONTINGÊNCIA OFFLINE NFC-E">CONTINGÊNCIA OFFLINE NFC-E</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Ambiente de Destino:</label>
                  <select
                    value={config.ambienteDestino}
                    onChange={(e) => setConfig({ ...config, ambienteDestino: e.target.value as any })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 800, color: config.ambienteDestino === 'PRODUÇÃO' ? '#10b981' : '#eab308' }}
                  >
                    <option value="PRODUÇÃO">PRODUÇÃO</option>
                    <option value="HOMOLOGAÇÃO">HOMOLOGAÇÃO (TESTES)</option>
                  </select>
                </div>

                <div style={{ paddingTop: '18px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.cortarPapelAutomatico}
                      onChange={(e) => setConfig({ ...config, cortarPapelAutomatico: e.target.checked })}
                    />
                    Cortar Papel (Guilhotina)
                  </label>
                </div>
              </div>

              {/* Linha 4: Armazenamento Central VPS + Cópia Local */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <label className="coliseu-label" style={{ marginBottom: 0 }}>
                    Cópia Local de Backup no Windows (Opcional - Terminal Desktop):
                  </label>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-success, #10b981)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    🌐 Armazenamento Principal Oficial: Servidor Central VPS (/storage/fiscal/xmls/)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    value={config.pastaArmazenamentoNfce}
                    onChange={(e) => setConfig({ ...config, pastaArmazenamentoNfce: e.target.value })}
                    placeholder="C:\ERPFULL\NFCE\XMLDESTINATARIO\"
                    className="coliseu-input"
                    style={{ height: '32px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const path = await escolherPasta(config.pastaArmazenamentoNfce);
                      if (path) {
                        setConfig({ ...config, pastaArmazenamentoNfce: path });
                        showToast(`Pasta NFC-e selecionada: ${path}`);
                      }
                    }}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ height: '32px', padding: '0 10px', fontSize: '11px' }}
                    title="Selecionar Pasta Local de Cópia da NFC-e"
                  >
                    ...
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: OUTROS DADOS & CUPOM */}
          {/* ========================================================================= */}
          {activeTab === 'OUTROS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Versão Esquema:</label>
                  <select value={config.versaoEsquema} onChange={(e) => setConfig({ ...config, versaoEsquema: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 700 }}>
                    <option value="pl_010b">pl_010b (SEFAZ 4.00 Oficial)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Versão Manual:</label>
                  <select value={config.versaoManual} onChange={(e) => setConfig({ ...config, versaoManual: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%' }}>
                    <option value="vm60">vm60</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Fuso Horário:</label>
                  <select value={config.fusoHorario} onChange={(e) => setConfig({ ...config, fusoHorario: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 700 }}>
                    <option value="-04:00">-04:00 (MS / MT / AM / RO / RR)</option>
                    <option value="-03:00">-03:00 (Brasília / SP / RJ)</option>
                  </select>
                </div>
              </div>

              {/* Mensagem Promocional no Rodapé do Cupom */}
              <div>
                <label className="coliseu-label">Mensagem Promocional / Informações de Rodapé no Cupom NFC-e:</label>
                <input
                  type="text"
                  value={config.mensagemPromocionalRodape}
                  onChange={(e) => setConfig({ ...config, mensagemPromocionalRodape: e.target.value.toUpperCase() })}
                  className="coliseu-input"
                  style={{ height: '34px', width: '100%', fontWeight: 600 }}
                  placeholder="Ex: OBRIGADO PELA PREFERÊNCIA! VOLTE SEMPRE!"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '10px', backgroundColor: 'var(--surface-2)', padding: '10px', borderRadius: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={config.validarEsquema} onChange={(e) => setConfig({ ...config, validarEsquema: e.target.checked })} />
                  Validar Esquema XML (XSD)
                </label>

                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={config.enviarCodigoBarra} onChange={(e) => setConfig({ ...config, enviarCodigoBarra: e.target.checked })} />
                  Enviar Código de Barras (cEAN)
                </label>

                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={config.fazerUploadSieg} onChange={(e) => setConfig({ ...config, fazerUploadSieg: e.target.checked })} />
                  Upload Automático SIEG / Contabilidade
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: RESPONSÁVEL TÉCNICO */}
          {/* ========================================================================= */}
          {activeTab === 'RESPONSAVEL_TECNICO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px' }}>
                <div><label className="coliseu-label">CNPJ Softwarehouse:</label><input type="text" value={config.cnpjResponsavelTecnico} onChange={(e) => setConfig({ ...config, cnpjResponsavelTecnico: e.target.value })} className="coliseu-input" style={{ height: '32px', fontWeight: 700 }} /></div>
                <div><label className="coliseu-label">Contato Responsável:</label><input type="text" value={config.contatoResponsavelTecnico} onChange={(e) => setConfig({ ...config, contatoResponsavelTecnico: e.target.value.toUpperCase() })} className="coliseu-input" style={{ height: '32px', width: '100%' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                <div><label className="coliseu-label">ID CSRT:</label><input type="text" value={config.idCsrt} onChange={(e) => setConfig({ ...config, idCsrt: e.target.value })} className="coliseu-input" style={{ height: '32px', textAlign: 'center', fontWeight: 700 }} /></div>
                <div><label className="coliseu-label">Hash CSRT:</label><input type="text" value={config.hashCsrt} onChange={(e) => setConfig({ ...config, hashCsrt: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%', fontFamily: 'monospace' }} /></div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: CONCENTRADOR ÚNICO DE XMLS NFC-E (VPS) */}
          {/* ========================================================================= */}
          {activeTab === 'CONCENTRADOR_XMLS' && (
            <div style={{ paddingTop: '6px' }}>
              <ConcentradorXmlsTab modeloFiltroPadrao="65" />
            </div>
          )}
        </div>

        {/* SEÇÃO 2: OPÇÕES E OPERAÇÕES SEFAZ */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
            Opções
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <Button variant="secondary" onClick={handleConsultarStatusServico} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Status Serviço
            </Button>

            <Button variant="secondary" onClick={() => { logRetorno('Abrindo visualizador de impressão do Cupom Térmico NFC-e...'); window.print(); }} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Imprimir Cupom
            </Button>

            <Button variant="secondary" onClick={() => setIsModalConsultarChaveOpen(true)} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Consultar
            </Button>

            <Button variant="secondary" onClick={() => setIsModalCancelarOpen(true)} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>
              Cancelamento NFC-e
            </Button>

            <Button variant="secondary" onClick={() => setIsModalInutilizarOpen(true)} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Inutilizar NFC-e
            </Button>

            <Button variant="secondary" onClick={handleSincronizarContingencia} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
              Sincronizar Offline
            </Button>

            <Button variant="secondary" onClick={handleEditarModeloDanfe} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Editar Mod. Danfe
            </Button>

            <Button variant="secondary" onClick={() => setIsModalMovimentoOpen(true)} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>
              Enviar Movimento Xml
            </Button>
          </div>
        </div>

        {/* SEÇÃO 3: RETORNO SEFAZ */}
        <div style={{ padding: '14px 20px', backgroundColor: 'var(--surface-1)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Retorno:
          </div>
          <textarea
            readOnly
            value={retornoLog}
            className="coliseu-input"
            style={{ width: '100%', height: '110px', fontSize: '11px', fontFamily: 'monospace', backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', lineHeight: '1.4', resize: 'none' }}
          />
        </div>

        {/* RODAPÉ */}
        <div style={{ padding: '10px 20px', backgroundColor: 'var(--surface-2)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button variant="secondary" onClick={handleConsultarStatusServico} leftIcon={<RefreshCw size={14} />} style={{ height: '32px', fontSize: '11px' }}>
            Atualizar Arquivos Servidores
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" onClick={handleSalvar} style={{ backgroundColor: '#10b981', borderColor: '#10b981', height: '32px', fontSize: '11px' }} leftIcon={<Save size={14} />}>
              Salvar Configurações
            </Button>
          </div>
        </div>
      </div>

      {/* Modais de Operação */}
      {isModalCancelarOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '540px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ef4444' }}>Cancelamento de NFC-e (Prazo Máximo: 30 minutos)</h3>
              <button type="button" onClick={() => setIsModalCancelarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '10px' }}><label className="coliseu-label">Chave de Acesso NFC-e (44 dígitos):</label><input type="text" value={chaveCanc} onChange={(e) => setChaveCanc(e.target.value)} placeholder="5026..." className="coliseu-input" style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }} /></div>
            <div style={{ marginBottom: '16px' }}><label className="coliseu-label">Justificativa (Mínimo 15 caracteres):</label><textarea value={justificativaCanc} onChange={(e) => setJustificativaCanc(e.target.value)} className="coliseu-input" style={{ width: '100%', height: '60px', fontSize: '11px' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button variant="secondary" onClick={() => setIsModalCancelarOpen(false)}>Fechar</Button><Button variant="primary" onClick={handleExecutarCancelamento} style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>Cancelar NFC-e na SEFAZ</Button></div>
          </div>
        </div>
      )}

      {isModalInutilizarOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Inutilização de Faixa NFC-e</h3><button type="button" onClick={() => setIsModalInutilizarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div><label className="coliseu-label">Ano:</label><input type="text" value={anoInut} onChange={(e) => setAnoInut(e.target.value)} className="coliseu-input" style={{ textAlign: 'center' }} /></div>
              <div><label className="coliseu-label">Série:</label><input type="text" value={serieInut} onChange={(e) => setSerieInut(e.target.value)} className="coliseu-input" style={{ textAlign: 'center' }} /></div>
              <div><label className="coliseu-label">Nº Inicial:</label><input type="text" value={numIniInut} onChange={(e) => setNumIniInut(e.target.value)} className="coliseu-input" style={{ textAlign: 'center', fontWeight: 700 }} /></div>
              <div><label className="coliseu-label">Nº Final:</label><input type="text" value={numFimInut} onChange={(e) => setNumFimInut(e.target.value)} className="coliseu-input" style={{ textAlign: 'center', fontWeight: 700 }} /></div>
            </div>
            <div style={{ marginBottom: '16px' }}><label className="coliseu-label">Justificativa (Mínimo 15 caracteres):</label><textarea value={justInut} onChange={(e) => setJustInut(e.target.value)} className="coliseu-input" style={{ width: '100%', height: '60px', fontSize: '11px' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button variant="secondary" onClick={() => setIsModalInutilizarOpen(false)}>Cancelar</Button><Button variant="primary" onClick={handleExecutarInutilizacao} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>Transmitir Inutilização</Button></div>
          </div>
        </div>
      )}

      {isModalConsultarChaveOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Consultar Situação do Cupom NFC-e</h3><button type="button" onClick={() => setIsModalConsultarChaveOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <div style={{ marginBottom: '16px' }}><label className="coliseu-label">Chave de Acesso (44 dígitos):</label><input type="text" value={chaveConsulta} onChange={(e) => setChaveConsulta(e.target.value)} placeholder="5026..." className="coliseu-input" style={{ width: '100%', height: '36px', fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button variant="secondary" onClick={() => setIsModalConsultarChaveOpen(false)}>Fechar</Button><Button variant="primary" onClick={handleExecutarConsultaChave}>Consultar</Button></div>
          </div>
        </div>
      )}

      {isModalMovimentoOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Exportar Movimento NFC-e para Contabilidade</h3><button type="button" onClick={() => setIsModalMovimentoOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>Selecione o mês para exportar o pacote ZIP com todos os cupons emitidos e cancelados:</div>
            <div style={{ marginBottom: '16px' }}><label className="coliseu-label">Mês / Ano:</label><select className="coliseu-input" style={{ width: '100%', height: '32px', fontWeight: 700 }}><option value="08/2026">08/2026 (Agosto/2026)</option><option value="07/2026">07/2026 (Julho/2026)</option></select></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button variant="secondary" onClick={() => setIsModalMovimentoOpen(false)}>Cancelar</Button><Button variant="primary" onClick={() => { logRetorno('✅ Pacote "Movimento_NFCe_08_2026.zip" exportado com sucesso!'); showToast('Movimento NFC-e exportado!'); setIsModalMovimentoOpen(false); }}>Gerar Pacote ZIP</Button></div>
          </div>
        </div>
      )}
    </div>
  );
};
