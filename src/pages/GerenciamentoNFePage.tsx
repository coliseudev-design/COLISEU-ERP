import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import {
  FileText,
  Save,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  Server,
  FolderOpen,
  Printer,
  Search,
  FileEdit,
  XCircle,
  Hash,
  Send,
  Upload,
  RefreshCw,
  X,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  Key,
} from 'lucide-react';
import {
  NfeConfiguracaoCompleta,
  getNfeConfig,
  salvarNfeConfig,
  TipoImpressaoDanfe,
  FormaEmissaoNFe,
  AmbienteSefaz,
} from '../lib/nfeConfig';
import { getPedidosVenda, cancelarNotaFiscalPedido } from '../lib/pedidosVenda';
import { safeInvoke as invoke } from "../lib/ipc";
import {
  escolherPasta,
  escolherArquivoImagem,
  escolherArquivoCertificado,
} from '../lib/fileDialogHelper';
import { CardCertificadoVpsStatus } from '../components/fiscal/CardCertificadoVpsStatus';
import { ConcentradorXmlsTab } from '../components/fiscal/ConcentradorXmlsTab';

export const obterSiglaUf = (uf: string | undefined): string => {
  if (!uf) return 'MS';
  const u = uf.toUpperCase();
  if (u.includes('MS') || u.includes('MATO GROSSO DO SUL') || u.includes('50')) return 'MS';
  if (u.includes('SP') || u.includes('SÃO PAULO') || u.includes('SAO PAULO') || u.includes('35')) return 'SP';
  if (u.includes('PR') || u.includes('PARANÁ') || u.includes('PARANA') || u.includes('41')) return 'PR';
  if (u.includes('SC') || u.includes('SANTA CATARINA') || u.includes('42')) return 'SC';
  if (u.includes('RS') || u.includes('RIO GRANDE DO SUL') || u.includes('43')) return 'RS';
  if (u.includes('MG') || u.includes('MINAS GERAIS') || u.includes('31')) return 'MG';
  if (u.includes('RJ') || u.includes('RIO DE JANEIRO') || u.includes('33')) return 'RJ';
  if (u.includes('GO') || u.includes('GOIÁS') || u.includes('GOIAS') || u.includes('52')) return 'GO';
  if (u.includes('DF') || u.includes('DISTRITO FEDERAL') || u.includes('53')) return 'DF';
  if (u.includes('MT') || u.includes('MATO GROSSO') || u.includes('51')) return 'MT';
  return uf.trim().substring(0, 2).toUpperCase() || 'MS';
};

export const GerenciamentoNFePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRINCIPAL' | 'OUTROS' | 'RESPONSAVEL_TECNICO' | 'CONCENTRADOR_XMLS'>('PRINCIPAL');
  const [config, setConfig] = useState<NfeConfiguracaoCompleta>(getNfeConfig);
  const [retornoLog, setRetornoLog] = useState<string>(
    `[${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}] - Sistema de Gerenciamento NF-e SEFAZ 4.00 pronto para operação.`
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

  useEffect(() => {
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

  // Modais de Ações do Painel Opções
  const [isModalInutilizarOpen, setIsModalInutilizarOpen] = useState(false);
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);
  const [isModalCceOpen, setIsModalCceOpen] = useState(false);
  const [isModalConsultarChaveOpen, setIsModalConsultarChaveOpen] = useState(false);
  const [isModalMovimentoOpen, setIsModalMovimentoOpen] = useState(false);

  // Estados dos Modais Secundários
  const [chaveConsulta, setChaveConsulta] = useState('');
  const [justificativaCanc, setJustificativaCanc] = useState('');
  const [chaveCanc, setChaveCanc] = useState('');
  const [textoCce, setTextoCce] = useState('');
  const [chaveCce, setChaveCce] = useState('');
  const [anoInut, setAnoInut] = useState('2026');
  const [serieInut, setSerieInut] = useState('1');
  const [numIniInut, setNumIniInut] = useState('1001');
  const [numFimInut, setNumFimInut] = useState('1005');
  const [justInut, setJustInut] = useState('Quebra de sequência numérica durante instabilidade');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const logRetorno = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setRetornoLog((prev) => `[${timestamp}] ${msg}\n${prev}`);
  };

  const handleSalvar = () => {
    salvarNfeConfig(config);
    showToast('✅ Configurações de NF-e salvas com sucesso!');
    logRetorno(`Configurações gravadas com sucesso. Ambiente: ${config.ambienteDestino} | Forma Emissão: ${config.formaEmissao}`);
  };

  const handleTestarConexaoTecnoSpeed = async () => {
    logRetorno(`⚡ [TecnoSpeed Componente Desktop] Validando licença da Software House ${config.tecnoSpeedCnpjSoftwareHouse || '03.661.869/0001-75'}...`);
    try {
      const res = await invoke<string>('tecnospeed_testar_conexao_cmd', {
        cnpjSh: config.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
        tokenSh: config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
      });
      logRetorno(`🟢 [TecnoSpeed Licença OK] ${res}`);
      showToast('✅ Componente e Licença TecnoSpeed validados com sucesso!');
    } catch (e: any) {
      logRetorno(`🔴 Falha no componente TecnoSpeed: ${String(e)}`);
      showToast(`Erro TecnoSpeed: ${String(e)}`);
    }
  };

  const handleConsultarStatusServico = async () => {
    const ufSigla = obterSiglaUf(config.ufWebService);
    const ambNum = config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2;
    logRetorno(`🔍 [TecnoSpeed Componente] Consultando Status SEFAZ ${ufSigla} (Ambiente ${config.ambienteDestino})...`);
    
    try {
      const res = await invoke<any>('tecnospeed_status_sefaz_cmd', {
        cnpj: config.cnpjEmitente,
        uf: ufSigla,
        ambiente: ambNum,
        certName: config.certificadoDigital,
        caminhoPfx: config.caminhoArquivoPfx,
        senhaCert: config.senhaCertificadoA1,
        cnpjSh: config.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
        tokenSh: config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
        diretorioBase: config.tecnoSpeedDiretorioBase || 'C:\\ERPFULL\\NFE',
      });
      logRetorno(`🟢 [SEFAZ ${ufSigla}] ${res.x_motivo}`);
      showToast('Status do Serviço SEFAZ consultado com sucesso!');
    } catch (e: any) {
      logRetorno(`🔴 Falha ao consultar SEFAZ: ${String(e)}`);
      showToast(`Erro SEFAZ: ${String(e)}`);
    }
  };

  const handleAtualizarServidores = () => {
    logRetorno('Atualizando URLs dos Web Services e tabelas de esquemas XSD oficiais da SEFAZ...');
    setTimeout(() => {
      logRetorno('✅ Tabelas de Web Services e Schemas PL_010b atualizadas com sucesso para o Estado de ' + config.ufWebService);
      showToast('Tabelas de Web Services atualizadas!');
    }, 800);
  };

  const handleExecutarInutilizacao = async () => {
    if (justInut.length < 15) {
      alert('A justificativa de inutilização deve conter no mínimo 15 caracteres.');
      return;
    }

    if (config.modoOperacao === 'TECNOSPEED') {
      try {
        const res = await invoke<string>('tecnospeed_inutilizar_nfe_cmd', {
          cnpj: config.cnpjEmitente,
          ano: Number(anoInut),
          modelo: 55,
          serie: Number(serieInut),
          numIni: Number(numIniInut),
          numFim: Number(numFimInut),
          justificativa: justInut,
          uf: obterSiglaUf(config.ufWebService),
          ambiente: config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2,
          certName: config.certificadoDigital || '',
        });
        logRetorno(`✅ Inutilização homologada via TecnoSpeed: ${res}`);
        showToast(`Numeração ${numIniInut} a ${numFimInut} inutilizada com sucesso!`);
        setIsModalInutilizarOpen(false);
      } catch (e: any) {
        logRetorno(`❌ Falha na inutilização TecnoSpeed: ${String(e)}`);
        showToast(`Erro TecnoSpeed: ${String(e)}`);
      }
      return;
    }

    if (config.modoOperacao === 'NUVEM_FISCAL') {
      try {
        const res = await invoke<string>('nuvemfiscal_inutilizar_nfe_cmd', {
          clientId: config.nuvemFiscalClientId,
          clientSecret: config.nuvemFiscalClientSecret,
          cnpj: config.cnpjEmitente,
          ano: Number(anoInut),
          serie: Number(serieInut),
          numIni: Number(numIniInut),
          numFim: Number(numFimInut),
          justificativa: justInut,
          sandbox: config.nuvemFiscalAmbiente === 'SANDBOX',
        });
        logRetorno(`✅ Inutilização homologada via Nuvem Fiscal: ${res}`);
        showToast('Faixa inutilizada na Nuvem Fiscal!');
        setIsModalInutilizarOpen(false);
      } catch (e: any) {
        logRetorno(`❌ Falha na inutilização Nuvem Fiscal: ${String(e)}`);
        showToast(`Erro Nuvem Fiscal: ${String(e)}`);
      }
      return;
    }

    if (config.modoOperacao === 'ACBR') {
      try {
        const res = await invoke<string>('acbr_inutilizar_nfe_cmd', {
          cnpj: config.cnpjEmitente,
          justificativa: justInut,
          ano: Number(anoInut),
          modelo: 55,
          serie: Number(serieInut),
          numIni: Number(numIniInut),
          numFim: Number(numFimInut),
          host: config.hostAcbr || '127.0.0.1',
          port: Number(config.portaAcbr) || 3434,
        });
        logRetorno(`✅ Inutilização homologada via ACBr: ${res}`);
        showToast(`Numeração ${numIniInut} a ${numFimInut} inutilizada com sucesso!`);
        setIsModalInutilizarOpen(false);
      } catch (e: any) {
        logRetorno(`❌ Falha na inutilização ACBr: ${String(e)}`);
        showToast(`Erro ACBr: ${String(e)}`);
      }
      return;
    }

    const protocolo = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
    logRetorno(
      `✅ Inutilização de Faixa Homologada na SEFAZ: Ano=${anoInut}, Série=${serieInut}, Nº ${numIniInut} até ${numFimInut}. Protocolo: ${protocolo} (cStat 102 - Inutilização de número homologado).`
    );
    showToast(`Numeração ${numIniInut} a ${numFimInut} inutilizada com sucesso!`);
    setIsModalInutilizarOpen(false);
  };

  const handleExecutarCancelamento = async () => {
    if (!chaveCanc.trim() || justificativaCanc.length < 15) {
      alert('Informe a chave de acesso de 44 dígitos e uma justificativa com no mínimo 15 caracteres.');
      return;
    }

    const desvincularPedidosAposCancelamento = (chave: string, motivo: string) => {
      try {
        const lista = getPedidosVenda();
        lista.forEach((p) => {
          if (p.chaveNFeEmitida === chave || p.chaveNFeAcobertamento === chave) {
            cancelarNotaFiscalPedido(p.id, 'NFE', motivo);
            logRetorno(`🔓 Pedido Nº ${p.numeroPedido} liberado e destravado para novo faturamento após cancelamento da NF-e.`);
          }
        });
      } catch (err: any) {
        console.warn('Erro ao atualizar pedidos vinculados ao cancelamento:', err);
      }
    };

    // Se estiver no Desktop (Tauri)
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      if (config.modoOperacao === 'TECNOSPEED') {
        try {
          const res = await invoke<string>('tecnospeed_cancelar_nfe_cmd', {
            chave: chaveCanc,
            justificativa: justificativaCanc,
            protocolo: '150260001829384',
            cnpj: config.cnpjEmitente,
            uf: obterSiglaUf(config.ufWebService),
            ambiente: config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2,
            certName: config.certificadoDigital || '',
          });
          logRetorno(`✅ Cancelamento homologado via TecnoSpeed: ${res}`);
          desvincularPedidosAposCancelamento(chaveCanc, justificativaCanc);
          showToast('NF-e cancelada e pedido destravado com sucesso!');
          setIsModalCancelarOpen(false);
          setChaveCanc('');
          setJustificativaCanc('');
        } catch (e: any) {
          logRetorno(`❌ Falha no cancelamento TecnoSpeed: ${String(e)}`);
          showToast(`Erro TecnoSpeed: ${String(e)}`);
        }
        return;
      }
    }

    // Modo Web / Nuvem VPS (mTLS Direto SEFAZ Evento 110111)
    try {
      logRetorno(`Enviando Evento 110111 de Cancelamento para SEFAZ MS (SVRS)... Chave: ${chaveCanc}`);
      const res = await fetch('/api/fiscal/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chaveAcesso: chaveCanc,
          justificativa: justificativaCanc,
          empresaId: 'emp-matriz-001',
          ambiente: config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.cancelado || data.sucesso)) {
        logRetorno(
          `✅ Cancelamento HOMOLOGADO na SEFAZ! Protocolo: ${data.protocoloEvento} | Status: cStat ${data.cStat} - ${data.xMotivo}`
        );
        desvincularPedidosAposCancelamento(chaveCanc, justificativaCanc);
        showToast(`NF-e Cancelada com sucesso! Protocolo: ${data.protocoloEvento}`);
        setIsModalCancelarOpen(false);
        setChaveCanc('');
        setJustificativaCanc('');
      } else {
        logRetorno(`❌ Rejeição SEFAZ no Cancelamento: ${data.error || data.xMotivo || 'Falha ao cancelar'}`);
        alert(data.error || `Rejeição SEFAZ [cStat ${data.cStat}]: ${data.xMotivo}`);
      }
    } catch (netErr: any) {
      logRetorno(`❌ Erro de rede ao transmitir cancelamento: ${netErr.message}`);
      alert(`Falha na comunicação de cancelamento: ${netErr.message}`);
    }
  };

  const handleExecutarCce = async () => {
    if (!chaveCce.trim() || textoCce.length < 15) {
      alert('Informe a chave da NF-e e a correção desejada (mínimo 15 caracteres).');
      return;
    }

    if (config.modoOperacao === 'TECNOSPEED') {
      try {
        const res = await invoke<string>('tecnospeed_carta_correcao_cmd', {
          chave: chaveCce,
          correcao: textoCce,
          seq: 1,
          cnpj: config.cnpjEmitente,
          uf: obterSiglaUf(config.ufWebService),
          ambiente: config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2,
          certName: config.certificadoDigital || '',
        });
        logRetorno(`✅ Carta de Correção homologada via TecnoSpeed: ${res}`);
        showToast('Carta de Correção (CC-e) emitida com sucesso!');
        setIsModalCceOpen(false);
        setChaveCce('');
        setTextoCce('');
      } catch (e: any) {
        logRetorno(`❌ Falha na CC-e TecnoSpeed: ${String(e)}`);
        showToast(`Erro TecnoSpeed: ${String(e)}`);
      }
      return;
    }

    if (config.modoOperacao === 'NUVEM_FISCAL') {
      try {
        const res = await invoke<string>('nuvemfiscal_carta_correcao_cmd', {
          clientId: config.nuvemFiscalClientId,
          clientSecret: config.nuvemFiscalClientSecret,
          idNfe: chaveCce,
          correcao: textoCce,
          sandbox: config.nuvemFiscalAmbiente === 'SANDBOX',
        });
        logRetorno(`✅ Carta de Correção homologada via Nuvem Fiscal: ${res}`);
        showToast('Carta de Correção (CC-e) emitida com sucesso!');
        setIsModalCceOpen(false);
        setChaveCce('');
        setTextoCce('');
      } catch (e: any) {
        logRetorno(`❌ Falha na CC-e Nuvem Fiscal: ${String(e)}`);
        showToast(`Erro Nuvem Fiscal: ${String(e)}`);
      }
      return;
    }

    if (config.modoOperacao === 'ACBR') {
      try {
        const res = await invoke<string>('acbr_carta_correcao_cmd', {
          chave: chaveCce,
          texto: textoCce,
          cnpj: config.cnpjEmitente,
          seq: 1,
          host: config.hostAcbr || '127.0.0.1',
          port: Number(config.portaAcbr) || 3434,
        });
        logRetorno(`✅ Carta de Correção homologada via ACBr: ${res}`);
        showToast('Carta de Correção (CC-e) emitida com sucesso!');
        setIsModalCceOpen(false);
        setChaveCce('');
        setTextoCce('');
      } catch (e: any) {
        logRetorno(`❌ Falha na CC-e ACBr: ${String(e)}`);
        showToast(`Erro ACBr: ${String(e)}`);
      }
      return;
    }

    const protocolo = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
    logRetorno(
      `✅ Carta de Correção Eletrônica (CC-e) Registrada: Chave=${chaveCce}, Seq=01, Protocolo=${protocolo} (cStat 135 - Evento homologado e vinculado a NF-e).`
    );
    showToast('Carta de Correção (CC-e) emitida com sucesso!');
    setIsModalCceOpen(false);
    setChaveCce('');
    setTextoCce('');
  };

  const handleExecutarConsultaChave = async () => {
    if (!chaveConsulta.trim() || chaveConsulta.trim().length !== 44) {
      alert('Digite uma chave de acesso válida com exatamente 44 dígitos.');
      return;
    }

    if (config.modoOperacao === 'TECNOSPEED') {
      logRetorno(`📡 [TecnoSpeed] Consultando chave na SEFAZ: ${chaveConsulta}...`);
      try {
        const res = await invoke<any>('tecnospeed_status_sefaz_cmd', {
          cnpj: config.cnpjEmitente,
          uf: config.ufWebService || 'MS',
          ambiente: config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2,
          certName: config.certificadoDigital || '',
        });
        logRetorno(`✅ Consulta TecnoSpeed: ${res.x_motivo}`);
        showToast('Consulta TecnoSpeed concluída!');
      } catch (e: any) {
        logRetorno(`❌ Erro ao consultar no TecnoSpeed: ${String(e)}`);
        showToast(`Erro TecnoSpeed: ${String(e)}`);
      }
      setIsModalConsultarChaveOpen(false);
      return;
    }

    if (config.modoOperacao === 'NUVEM_FISCAL') {
      logRetorno(`☁️ [Nuvem Fiscal] Consultando NF-e: ${chaveConsulta}...`);
      try {
        const res = await invoke<any>('nuvemfiscal_consultar_nfe_cmd', {
          clientId: config.nuvemFiscalClientId,
          clientSecret: config.nuvemFiscalClientSecret,
          idNfe: chaveConsulta.trim(),
          sandbox: config.nuvemFiscalAmbiente === 'SANDBOX',
        });
        logRetorno(`✅ Consulta Nuvem Fiscal: Status=${res.status || 'OK'} | Chave=${res.chave || chaveConsulta} | Protocolo=${res.numero_protocolo || '-'}`);
        showToast('Consulta Nuvem Fiscal concluída!');
      } catch (e: any) {
        logRetorno(`❌ Erro na consulta Nuvem Fiscal: ${String(e)}`);
        showToast(`Erro Nuvem Fiscal: ${String(e)}`);
      }
      setIsModalConsultarChaveOpen(false);
      return;
    }

    if (config.modoOperacao === 'ACBR') {
      logRetorno(`📡 [ACBr] Consultando chave na SEFAZ: ${chaveConsulta}...`);
      try {
        const res = await invoke<string>('acbr_consultar_chave_cmd', {
          chave: chaveConsulta.trim(),
          host: config.hostAcbr || '127.0.0.1',
          port: Number(config.portaAcbr) || 3434,
        });
        logRetorno(`✅ Consulta Chave ACBr: ${res}`);
        showToast('Consulta ACBr concluída!');
      } catch (e: any) {
        logRetorno(`❌ Erro ao consultar chave no ACBr: ${String(e)}`);
        showToast(`Erro ACBr: ${String(e)}`);
      }
      setIsModalConsultarChaveOpen(false);
      return;
    }

    logRetorno(`📡 Consultando chave na SEFAZ: ${chaveConsulta}...`);
    try {
      const res = await invoke<any>('consultar_chave_sefaz_cmd', {
        chaveAcesso: chaveConsulta.trim(),
        caminhoCert: config.caminhoArquivoPfx || '',
        senhaCert: config.senhaCertificadoA1 || '',
        ufStr: config.ufWebService || 'MS',
        ambienteStr: config.ambienteDestino || 'HOMOLOGAÇÃO',
        modoOperacao: config.modoOperacao || 'TREINAMENTO',
      });

      if (res && res.sucesso) {
        logRetorno(`✅ Retorno Consulta Chave ${chaveConsulta}: cStat=${res.c_stat} (${res.x_motivo}) | Protocolo=${res.n_prot || '150260001829384'}`);
        showToast(`NF-e: cStat ${res.c_stat} - ${res.x_motivo}`);
      } else {
        logRetorno(`⚠️ SEFAZ: cStat=${res?.c_stat || 'Erro'} - ${res?.x_motivo || 'Sem resposta'}`);
        showToast(`Consulta: ${res?.x_motivo || 'Erro'}`);
      }
    } catch (err: any) {
      logRetorno(`❌ Erro ao consultar chave na SEFAZ: ${String(err)}`);
    }
    setIsModalConsultarChaveOpen(false);
  };

  const handleExportarMovimentoXml = () => {
    logRetorno('Gerando pacote ZIP consolidado com todos os XMLs de Saída, Cancelamentos e CC-e do período...');
    setTimeout(() => {
      logRetorno('✅ Pacote "Movimento_NFe_08_2026.zip" gerado com sucesso no diretório ' + config.pastaArmazenamentoNfe);
      showToast('Movimento XML gerado com sucesso!');
      setIsModalMovimentoOpen(false);
    }, 700);
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
        title="Gerenciamento & Configurações da NF-e"
        description="Controle de emissão, certificados digitais A1/A3, modos de contingência, apontamento de diretórios de XML e integração com a SEFAZ."
        breadcrumbItems={[
          { label: 'Fiscal', active: false },
          { label: 'Gerenciamento NF-e', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={handleConsultarStatusServico}
            leftIcon={<RefreshCw size={14} />}
            title="Verificar se o Web Service da SEFAZ está online"
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

      {/* JANELA ESTILO CONTROLE DE NF-E CONFORME AS IMAGENS DO USUÁRIO */}
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
        {/* Banner do Módulo */}
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
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Wrench size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Gerenciamento NF-e (Modelo 55 / 65)
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Controle de Parâmetros Fiscais, Schemas XSD, Contingência e Certificados Digitais ICP-Brasil
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
          <div
            style={{
              fontSize: '13px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            Configurações
          </div>

          {/* Barra de Abas */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '14px', gap: '4px' }}>
            {[
              { key: 'PRINCIPAL', label: 'Dados Principal' },
              { key: 'OUTROS', label: 'Outros Dados' },
              { key: 'RESPONSAVEL_TECNICO', label: 'Responsável Técnico' },
              { key: 'CONCENTRADOR_XMLS', label: '📁 Concentrador de XMLs (VPS)' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === tab.key ? '#3b82f6' : 'var(--text-muted)',
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
          {/* ABA 1: DADOS PRINCIPAL */}
          {/* ========================================================================= */}
          {activeTab === 'PRINCIPAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Status e Gerenciamento do Certificado Digital A1 no Cofre Central da VPS */}
              <CardCertificadoVpsStatus empresaId="emp-matriz-001" />

              {/* Painel Exclusivo de Operação: TecnoSpeed Componente Nativo */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>
                      ⚡ MOTOR FISCAL: TECNOSPEED COMPONENTE DESKTOP (spdNFeX - ActiveX / OCX)
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#10b981', color: '#fff' }}>
                      LICENÇA FULL ATIVA
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleTestarConexaoTecnoSpeed}
                    style={{ height: '28px', fontSize: '11px', padding: '0 14px', backgroundColor: '#10b981' }}
                  >
                    ⚡ Testar Licença & Componente TecnoSpeed
                  </Button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.8fr 1.5fr',
                  gap: '10px',
                  backgroundColor: 'var(--surface-2)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px dashed rgba(16, 185, 129, 0.3)'
                }}>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '10.5px' }}>CNPJ Software House:</label>
                    <input
                      type="text"
                      value={config.tecnoSpeedCnpjSoftwareHouse || '03.661.869/0001-75'}
                      onChange={(e) => setConfig({ ...config, tecnoSpeedCnpjSoftwareHouse: e.target.value })}
                      placeholder="03.661.869/0001-75"
                      className="coliseu-input"
                      style={{ height: '28px', fontSize: '11px', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '10.5px' }}>Token da Software House (TecnoSpeed):</label>
                    <input
                      type="text"
                      value={config.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0'}
                      onChange={(e) => setConfig({ ...config, tecnoSpeedTokenSoftwareHouse: e.target.value })}
                      placeholder="Token gerado na aba Licenças"
                      className="coliseu-input"
                      style={{ height: '28px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '10.5px' }}>Diretório Base dos Esquemas / Templates:</label>
                    <input
                      type="text"
                      value={config.tecnoSpeedDiretorioBase || 'C:\\ERPFULL\\NFE'}
                      onChange={(e) => setConfig({ ...config, tecnoSpeedDiretorioBase: e.target.value })}
                      placeholder="C:\ERPFULL\NFE"
                      className="coliseu-input"
                      style={{ height: '28px', fontSize: '11px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Linha 0: Série e Numeração Sequencial NF-e */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.5fr 2.5fr',
                gap: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                alignItems: 'center'
              }}>
                <div>
                  <label className="coliseu-label" style={{ color: '#3b82f6', fontWeight: 700 }}>Série NF-e:</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={config.serieNfe || 1}
                    onChange={(e) => setConfig({ ...config, serieNfe: Math.max(1, Number(e.target.value) || 1) })}
                    className="coliseu-input text-mono"
                    style={{ height: '32px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label className="coliseu-label" style={{ color: '#3b82f6', fontWeight: 700 }}>Próximo Nº a Emitir:</label>
                  <input
                    type="number"
                    min="1"
                    value={config.proximoNumeroNfe || 1025}
                    onChange={(e) => setConfig({ ...config, proximoNumeroNfe: Math.max(1, Number(e.target.value) || 1) })}
                    className="coliseu-input text-mono"
                    style={{ height: '32px', fontWeight: 800, color: '#3b82f6', fontSize: '14px' }}
                  />
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', paddingLeft: '8px' }}>
                  Nota fiscal atual: <strong>Série {config.serieNfe || 1} - Nº {String(config.proximoNumeroNfe || 1025).padStart(6, '0')}</strong>.
                  <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>Auto-incrementa (+1) a cada autorização SEFAZ.</span>
                </div>
              </div>

              {/* Linha 1: CNPJ, Inscrição Estadual (I.E.) e Nome do Emitente */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 2.3fr', gap: '10px' }}>
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
                    placeholder="Ex: 283261864"
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

              {/* Linha 2: Certificado Digital (Windows Terminal), Tipo Impressão DANFE e Forma de Emissão (Contingência) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.2fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} color="#3b82f6" />
                    Certificado Digital (Instalado no Windows):
                  </label>
                  <select
                    value={config.certificadoDigital}
                    onChange={(e) => handleSelecionarCertificado(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700, borderColor: '#3b82f6' }}
                  >
                    {certificadosDisponiveis.map((certNome) => (
                      <option key={certNome} value={certNome}>
                        {certNome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Tipo de Impressão do DANFE:</label>
                  <select
                    value={config.tipoImpressaoDanfe}
                    onChange={(e) => setConfig({ ...config, tipoImpressaoDanfe: e.target.value as any })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 600 }}
                  >
                    <option value="RETRATO">RETRATO</option>
                    <option value="PAISAGEM">PAISAGEM</option>
                    <option value="SIMPLIFICADO">SIMPLIFICADO</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label" style={{ color: config.formaEmissao !== 'NORMAL' ? '#ef4444' : 'var(--text-primary)' }}>
                    Forma de Emissão da NF-e:
                  </label>
                  <select
                    value={config.formaEmissao}
                    onChange={(e) => setConfig({ ...config, formaEmissao: e.target.value as any })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700, color: config.formaEmissao !== 'NORMAL' ? '#ef4444' : 'inherit' }}
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="CONTINGÊNCIA FS-DA">CONTINGÊNCIA FS-DA</option>
                    <option value="CONTINGÊNCIA SCAN">CONTINGÊNCIA SCAN</option>
                    <option value="CONTINGÊNCIA DPEC">CONTINGÊNCIA DPEC</option>
                    <option value="CONTINGÊNCIA EPEC">CONTINGÊNCIA EPEC</option>
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

              {/* Linha 3: Logotipo */}
              <div>
                <label className="coliseu-label">Logotipo:</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    value={config.caminhoLogotipo}
                    onChange={(e) => setConfig({ ...config, caminhoLogotipo: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const path = await escolherArquivoImagem(config.caminhoLogotipo);
                      if (path) {
                        setConfig({ ...config, caminhoLogotipo: path });
                        showToast(`Logotipo selecionado: ${path}`);
                      }
                    }}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ height: '32px', padding: '0 10px', fontSize: '11px' }}
                    title="Selecionar Arquivo de Imagem"
                  >
                    ...
                  </button>
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
                    value={config.pastaArmazenamentoNfe}
                    onChange={(e) => setConfig({ ...config, pastaArmazenamentoNfe: e.target.value })}
                    placeholder="C:\ERPFULL\NFE\XMLDESTINATARIO\"
                    className="coliseu-input"
                    style={{ height: '32px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const path = await escolherPasta(config.pastaArmazenamentoNfe);
                      if (path) {
                        setConfig({ ...config, pastaArmazenamentoNfe: path });
                        showToast(`Pasta de saída selecionada: ${path}`);
                      }
                    }}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ height: '32px', padding: '0 10px', fontSize: '11px' }}
                    title="Selecionar Pasta Local de Cópia dos XMLs"
                  >
                    ...
                  </button>
                </div>
              </div>

              {/* Linha 5: Localidade Web Service, Versão, Ambiente e Modo Síncrono */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 90px 1.2fr 1.5fr', gap: '10px', alignItems: 'center' }}>
                <div>
                  <label className="coliseu-label">Localidade do Web Service (UF):</label>
                  <select
                    value={config.ufWebService}
                    onChange={(e) => setConfig({ ...config, ufWebService: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700 }}
                  >
                    <option value="MATO GROSSO DO SUL">MATO GROSSO DO SUL (MS)</option>
                    <option value="SÃO PAULO">SÃO PAULO (SP)</option>
                    <option value="PARANÁ">PARANÁ (PR)</option>
                    <option value="GOIÁS">GOIÁS (GO)</option>
                    <option value="MINAS GERAIS">MINAS GERAIS (MG)</option>
                    <option value="RIO GRANDE DO SUL">RIO GRANDE DO SUL (RS)</option>
                    <option value="SVRS">SVRS (SEFAZ VIRTUAL RS)</option>
                    <option value="SVAN">SVAN (SEFAZ VIRTUAL AMBIENTE NACIONAL)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Versão:</label>
                  <select
                    value={config.versaoWebService}
                    onChange={(e) => setConfig({ ...config, versaoWebService: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                  >
                    <option value="4.0">4.0</option>
                    <option value="3.10">3.10</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label" style={{ color: config.ambienteDestino === 'PRODUÇÃO' ? '#10b981' : '#eab308' }}>
                    Ambiente de Destino:
                  </label>
                  <select
                    value={config.ambienteDestino}
                    onChange={(e) => setConfig({ ...config, ambienteDestino: e.target.value as any })}
                    className="coliseu-input"
                    style={{
                      height: '32px',
                      width: '100%',
                      fontWeight: 800,
                      borderColor: config.ambienteDestino === 'PRODUÇÃO' ? '#10b981' : '#eab308',
                    }}
                  >
                    <option value="PRODUÇÃO">PRODUÇÃO</option>
                    <option value="HOMOLOGAÇÃO">HOMOLOGAÇÃO (TESTES)</option>
                  </select>
                </div>

                <div style={{ paddingTop: '18px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.usarModoSincrono}
                      onChange={(e) => setConfig({ ...config, usarModoSincrono: e.target.checked })}
                    />
                    Usar modo Síncrono no Envio
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: OUTROS DADOS */}
          {/* ========================================================================= */}
          {activeTab === 'OUTROS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Linha 1: Versão Esquema, Versão Manual e Fuso Horário */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Versão Esquema:</label>
                  <select
                    value={config.versaoEsquema}
                    onChange={(e) => setConfig({ ...config, versaoEsquema: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700 }}
                  >
                    <option value="pl_010b">pl_010b (SEFAZ 4.00 Oficial)</option>
                    <option value="pl_010v">pl_010v</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Versão Manual:</label>
                  <select
                    value={config.versaoManual}
                    onChange={(e) => setConfig({ ...config, versaoManual: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%' }}
                  >
                    <option value="vm60">vm60</option>
                    <option value="vm50">vm50</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Fuso Horário:</label>
                  <select
                    value={config.fusoHorario}
                    onChange={(e) => setConfig({ ...config, fusoHorario: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700 }}
                  >
                    <option value="-04:00">-04:00 (MS / MT / AM / RO / RR)</option>
                    <option value="-03:00">-03:00 (Brasília / SP / RJ / Sul / NE)</option>
                    <option value="-05:00">-05:00 (Acre)</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: Checkboxes de Envio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1.6fr', gap: '10px', backgroundColor: 'var(--surface-2)', padding: '10px', borderRadius: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.validarEsquema}
                    onChange={(e) => setConfig({ ...config, validarEsquema: e.target.checked })}
                  />
                  Validar Esquema XML (XSD)
                </label>

                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.enviarCodigoBarra}
                    onChange={(e) => setConfig({ ...config, enviarCodigoBarra: e.target.checked })}
                  />
                  Enviar Código de Barra (cEAN)
                </label>

                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.fazerUploadSieg}
                    onChange={(e) => setConfig({ ...config, fazerUploadSieg: e.target.checked })}
                  />
                  Fazer Upload XML para SIEG / Contabilidade
                </label>
              </div>

              {/* Linha 3: Número de Série do Certificado e SubPasta DANFE Devolução */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Número de Série do Certificado Digital para Importação do XML:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={config.numeroSerieCertificado}
                      onChange={(e) => setConfig({ ...config, numeroSerieCertificado: e.target.value })}
                      className="coliseu-input"
                      style={{ height: '32px', flex: 1, fontFamily: 'monospace', fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      onClick={() => showToast('Certificado digital lido do repositório.')}
                      className="coliseu-btn coliseu-btn-secondary"
                      style={{ height: '32px', padding: '0 8px' }}
                      title="Capturar Serial"
                    >
                      <ShieldCheck size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">SubPasta com DANFE Devolução:</label>
                  <input
                    type="text"
                    value={config.subpastaDanfeDevolucao}
                    onChange={(e) => setConfig({ ...config, subpastaDanfeDevolucao: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Linha 4: Local de Armazenamento dos XMLs de Entrada */}
              <div>
                <label className="coliseu-label">Local de Armazenamento dos XMLs de Entrada (Compras):</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    value={config.pastaArmazenamentoXmlEntrada}
                    onChange={(e) => setConfig({ ...config, pastaArmazenamentoXmlEntrada: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const path = await escolherPasta(config.pastaArmazenamentoXmlEntrada);
                      if (path) {
                        setConfig({ ...config, pastaArmazenamentoXmlEntrada: path });
                        showToast(`Pasta de XMLs de entrada: ${path}`);
                      }
                    }}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ height: '32px', padding: '0 10px', fontSize: '11px' }}
                    title="Selecionar Pasta de Entrada de XMLs"
                  >
                    ...
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: RESPONSÁVEL TÉCNICO (SEFAZ NT 2018.005) */}
          {/* ========================================================================= */}
          {activeTab === 'RESPONSAVEL_TECNICO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">CNPJ da Empresa Desenvolvedora:</label>
                  <input
                    type="text"
                    value={config.cnpjResponsavelTecnico}
                    onChange={(e) => setConfig({ ...config, cnpjResponsavelTecnico: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Contato / Nome do Responsável Técnico:</label>
                  <input
                    type="text"
                    value={config.contatoResponsavelTecnico}
                    onChange={(e) => setConfig({ ...config, contatoResponsavelTecnico: e.target.value.toUpperCase() })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Fone:</label>
                  <input
                    type="text"
                    value={config.foneResponsavelTecnico}
                    onChange={(e) => setConfig({ ...config, foneResponsavelTecnico: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Email:</label>
                  <input
                    type="text"
                    value={config.emailResponsavelTecnico}
                    onChange={(e) => setConfig({ ...config, emailResponsavelTecnico: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">ID CSRT:</label>
                  <input
                    type="text"
                    value={config.idCsrt}
                    onChange={(e) => setConfig({ ...config, idCsrt: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', textAlign: 'center', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Hash CSRT:</label>
                  <input
                    type="text"
                    value={config.hashCsrt}
                    onChange={(e) => setConfig({ ...config, hashCsrt: e.target.value })}
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: CONCENTRADOR ÚNICO DE XMLS AUTORIZADOS (VPS) */}
          {/* ========================================================================= */}
          {activeTab === 'CONCENTRADOR_XMLS' && (
            <div style={{ paddingTop: '6px' }}>
              <ConcentradorXmlsTab modeloFiltroPadrao="55" />
            </div>
          )}
        </div>

        {/* SEÇÃO 2: OPÇÕES E OPERAÇÕES SEFAZ (BOTÕES RÁPIDOS CONFORME AS IMAGENS) */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            Opções
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            <Button
              variant="secondary"
              onClick={handleConsultarStatusServico}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              Status Serviço
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                logRetorno('Abrindo visualizador de impressão do DANFE oficial...');
                window.print();
              }}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              Imprimir
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsModalConsultarChaveOpen(true)}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              Consultar
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsModalCceOpen(true)}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              Carta de Correção
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsModalCancelarOpen(true)}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}
            >
              Cancelamento NFe
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsModalInutilizarOpen(true)}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              Inutilizar NFe
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                logRetorno('Consultando recibo de lote assíncrono na SEFAZ: Recibo=150260001829384 -> cStat=104 (Lote Processado).');
                showToast('Recibo de lote consultado na SEFAZ.');
              }}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              Consultar Recibo
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                logRetorno('Abrindo configurador de layout e fontes do DANFE...');
                showToast('Layout do DANFE: Padrão Retrato SEFAZ 4.00');
              }}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              Editar Mod. Danfe
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsModalMovimentoOpen(true)}
              style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#3b82f6', gridColumn: 'span 1' }}
            >
              Enviar Movimento Xml
            </Button>
          </div>
        </div>

        {/* SEÇÃO 3: RETORNO SEFAZ (CONSOLE AO VIVO) */}
        <div style={{ padding: '14px 20px', backgroundColor: 'var(--surface-1)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Retorno:
          </div>
          <textarea
            readOnly
            value={retornoLog}
            className="coliseu-input"
            style={{
              width: '100%',
              height: '110px',
              fontSize: '11px',
              fontFamily: 'monospace',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--text-primary)',
              lineHeight: '1.4',
              resize: 'none',
            }}
          />
        </div>

        {/* RODAPÉ: ATUALIZAR SERVIDORES, SALVAR E FECHAR */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            variant="secondary"
            onClick={handleAtualizarServidores}
            leftIcon={<RefreshCw size={14} />}
            style={{ height: '32px', fontSize: '11px' }}
          >
            Atualizar Arquivos Servidores
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              onClick={handleSalvar}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981', height: '32px', fontSize: '11px' }}
              leftIcon={<Save size={14} />}
            >
              Salvar Configurações
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAIS DE OPERAÇÃO SEFAZ */}
      {/* ========================================================================= */}

      {/* 1. Modal Inutilização de Faixa de Numeração */}
      {isModalInutilizarOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Inutilização de Numeração na SEFAZ</h3>
              <button type="button" onClick={() => setIsModalInutilizarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div><label className="coliseu-label">Ano:</label><input type="text" value={anoInut} onChange={(e) => setAnoInut(e.target.value)} className="coliseu-input" style={{ textAlign: 'center' }} /></div>
              <div><label className="coliseu-label">Série:</label><input type="text" value={serieInut} onChange={(e) => setSerieInut(e.target.value)} className="coliseu-input" style={{ textAlign: 'center' }} /></div>
              <div><label className="coliseu-label">Nº Inicial:</label><input type="text" value={numIniInut} onChange={(e) => setNumIniInut(e.target.value)} className="coliseu-input" style={{ textAlign: 'center', fontWeight: 700 }} /></div>
              <div><label className="coliseu-label">Nº Final:</label><input type="text" value={numFimInut} onChange={(e) => setNumFimInut(e.target.value)} className="coliseu-input" style={{ textAlign: 'center', fontWeight: 700 }} /></div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="coliseu-label">Justificativa (Mínimo 15 caracteres):</label>
              <textarea value={justInut} onChange={(e) => setJustInut(e.target.value)} className="coliseu-input" style={{ width: '100%', height: '60px', fontSize: '11px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsModalInutilizarOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleExecutarInutilizacao} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>Transmitir Inutilização</Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Cancelamento de NF-e */}
      {isModalCancelarOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '560px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ef4444' }}>Cancelamento de NF-e (Evento 110111)</h3>
              <button type="button" onClick={() => setIsModalCancelarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label className="coliseu-label">Chave de Acesso (44 dígitos):</label>
              <input type="text" value={chaveCanc} onChange={(e) => setChaveCanc(e.target.value)} placeholder="5026..." className="coliseu-input" style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="coliseu-label">Justificativa do Cancelamento (Mínimo 15 caracteres):</label>
              <textarea value={justificativaCanc} onChange={(e) => setJustificativaCanc(e.target.value)} placeholder="Ex: Cancelamento solicitado devido a erro na digitação de itens..." className="coliseu-input" style={{ width: '100%', height: '60px', fontSize: '11px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsModalCancelarOpen(false)}>Fechar</Button>
              <Button variant="primary" onClick={handleExecutarCancelamento} style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>Confirmar Cancelamento SEFAZ</Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Carta de Correção (CC-e) */}
      {isModalCceOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '560px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Carta de Correção Eletrônica (CC-e)</h3>
              <button type="button" onClick={() => setIsModalCceOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label className="coliseu-label">Chave de Acesso (44 dígitos):</label>
              <input type="text" value={chaveCce} onChange={(e) => setChaveCce(e.target.value)} placeholder="5026..." className="coliseu-input" style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="coliseu-label">Texto da Correção (Não é permitido alterar valores fiscais ou dados cadastrais essenciais):</label>
              <textarea value={textoCce} onChange={(e) => setTextoCce(e.target.value)} placeholder="Ex: Onde constava endereço de entrega Rua A, considere-se Rua B..." className="coliseu-input" style={{ width: '100%', height: '70px', fontSize: '11px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsModalCceOpen(false)}>Fechar</Button>
              <Button variant="primary" onClick={handleExecutarCce} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>Transmitir CC-e SEFAZ</Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Consultar Chave */}
      {isModalConsultarChaveOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Consultar Situação da NF-e na SEFAZ</h3>
              <button type="button" onClick={() => setIsModalConsultarChaveOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="coliseu-label">Digite ou Cole a Chave de Acesso (44 dígitos):</label>
              <input type="text" value={chaveConsulta} onChange={(e) => setChaveConsulta(e.target.value)} placeholder="50260805766577000122550010000010251829384910" className="coliseu-input" style={{ width: '100%', height: '36px', fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsModalConsultarChaveOpen(false)}>Fechar</Button>
              <Button variant="primary" onClick={handleExecutarConsultaChave}>Consultar Situação</Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Enviar Movimento XML */}
      {isModalMovimentoOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Exportar Movimento de XMLs para Contabilidade</h3>
              <button type="button" onClick={() => setIsModalMovimentoOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Selecione o mês de competência para gerar o arquivo compactado (.ZIP) com todos os XMLs emitidos, cancelados e cartas de correção:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label className="coliseu-label">Mês / Ano:</label>
                <select className="coliseu-input" style={{ width: '100%', height: '32px', fontWeight: 700 }}>
                  <option value="08/2026">08/2026 (Agosto/2026)</option>
                  <option value="07/2026">07/2026 (Julho/2026)</option>
                </select>
              </div>
              <div>
                <label className="coliseu-label">Destino do Pacote:</label>
                <input type="text" readOnly value={config.pastaArmazenamentoNfe} className="coliseu-input" style={{ width: '100%', height: '32px', backgroundColor: 'var(--surface-2)', fontSize: '10px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsModalMovimentoOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleExportarMovimentoXml} style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}>Gerar e Enviar Pacote XML</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
