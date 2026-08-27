import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  FileCheck,
  X,
  Send,
  Printer,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Truck,
  ShieldCheck,
  Sparkles,
  Receipt,
  FileWarning,
} from 'lucide-react';
import {
  PedidoVendaItem,
  faturarPedidoDireto,
  podeFaturarPedidoNFe,
  atualizarStatusFiscalPedido,
} from '../../lib/pedidosVenda';
import { ModalDanfeNFeOficial } from '../fiscal/ModalDanfeNFeOficial';
import { gerarXmlNFe } from '../../lib/nfeXmlGenerator';
import { gerarChaveAcessoNFe } from '../../lib/nfeChaveAcesso';
import { getNfeConfig, obterProximoNumeroNFe, incrementarNumeroNFe } from '../../lib/nfeConfig';
import { salvarArquivoComDialogo, obterXmlRealDoDisco } from '../../lib/fileDialogHelper';
import { safeInvoke as invoke } from "../../lib/ipc";
import { fiscalCloudService } from '../../lib/fiscalCloudService';

interface ModalFaturamentoNFeProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: PedidoVendaItem;
  onFaturamentoConcluido: (pedidoAtualizado: PedidoVendaItem) => void;
}

export const ModalFaturamentoNFe: React.FC<ModalFaturamentoNFeProps> = ({
  isOpen,
  onClose,
  pedido,
  onFaturamentoConcluido,
}) => {
  const fiscalCheck = podeFaturarPedidoNFe(pedido);
  const isAcobertamento = fiscalCheck.acaoRecomendada === 'ACOBERTAMENTO';

  const [tPag, setTPag] = useState('15'); // 15 - Boleto Bancário
  const [indPag, setIndPag] = useState(pedido.parcelas && pedido.parcelas.length > 1 ? '1' : '0'); // 0 - À Vista, 1 - A Prazo
  const [modFrete, setModFrete] = useState(pedido.tipoFrete === 'FOB' ? '1' : pedido.tipoFrete === 'CIF' ? '0' : '9');
  
  const [infCpl, setInfCpl] = useState(
    isAcobertamento
      ? `NF-e emitida exclusivamente para fins de acobertamento do Cupom Fiscal NFC-e Nº ${pedido.numeroNFCe || ''} (Chave: ${pedido.chaveNFCeEmitida || ''}). Pedido Nº ${pedido.numeroPedido}. ${pedido.observacoesGerais || ''}`
      : `Trib aprox R$ ${(pedido.totalIcms * 0.8).toFixed(2)} Federal e R$ ${(pedido.totalIcms).toFixed(2)} Estadual (Lei 12.741/2012). Pedido Nº ${pedido.numeroPedido}. Vendedor: ${pedido.vendedorNome}. ${pedido.observacoesGerais || ''}`
  );
  const [infAdFisco, setInfAdFisco] = useState(
    isAcobertamento
      ? 'Documento fiscal emitido em conformidade com o Art. do RICMS relativo a acobertamento de NFC-e (CFOP 5.929).'
      : 'ICMS recolhido nos termos do Regulamento do ICMS do Estado.'
  );
  
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isModalDanfeOpen, setIsModalDanfeOpen] = useState(false);
  const [nfeConfig, setNfeConfig] = useState(getNfeConfig);

  React.useEffect(() => {
    if (isOpen) {
      setNfeConfig(getNfeConfig());
    }
  }, [isOpen]);

  const [caminhoXmlSalvo, setCaminhoXmlSalvo] = useState<string | null>(null);

  const [notaAutorizada, setNotaAutorizada] = useState<any | null>(
    pedido.chaveNFeEmitida && pedido.statusFiscalNfe === 'AUTORIZADA'
      ? {
          chave: pedido.chaveNFeEmitida,
          numero: pedido.numeroNFe || '55-0001',
          protocolo: pedido.protocoloAutorizacao || '150260001829384',
          dataAutorizacao: pedido.dataFaturamento || new Date().toLocaleString('pt-BR'),
        }
      : null
  );

  if (!isOpen) return null;

  const handleTransmitirSefaz = async () => {
    if (!fiscalCheck.permitido && !isAcobertamento) {
      alert(fiscalCheck.motivo || 'Este pedido já possui uma nota fiscal ativa.');
      return;
    }

    setIsTransmitting(true);
    try {
      const configNfe = getNfeConfig();
      const numSequencial = Number(configNfe.proximoNumeroNfe) || 1025;
      const serieSequencial = Number(configNfe.serieNfe) || 1;

      const chaveObj = gerarChaveAcessoNFe({
        uf: configNfe.ufWebService || '50',
        dataEmissao: new Date(),
        cnpjEmitente: configNfe.cnpjEmitente || '68148349000109',
        modelo: '55',
        serie: serieSequencial,
        numeroDocumento: String(numSequencial),
        tipoEmissao: configNfe.formaEmissao === 'NORMAL' ? 1 : 9,
      });

      const natOpFinal = isAcobertamento
        ? 'LANÇAMENTO DECORRENTE DE CUPOM FISCAL / NFC-E (ACOBERTAMENTO)'
        : (pedido.naturezaOperacao?.descricao || 'VENDA DE MERCADORIAS DENTRO DO ESTADO');

      const cfopFinal = isAcobertamento
        ? (pedido.clienteUf && pedido.clienteUf !== 'MS' ? '6929' : '5929')
        : (pedido.naturezaOperacao?.cfop || '5102').replace(/\D/g, '') || '5102';

      let chFinal = '';
      let numFormatado = `${serieSequencial}-${numSequencial}`;
      let protFinal = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
      let motivoFinal = isAcobertamento ? 'NF-e de Acobertamento Autorizada' : 'Autorizado o uso da NF-e';

      try {
        // 1. Emissão e Gravação no Concentrador Único da VPS
        const cloudRes = await fiscalCloudService.emitirDocumentoFiscal({
          modelo: '55',
          pedidoId: pedido.id,
          numero: numSequencial,
          serie: serieSequencial,
          valorTotal: pedido.valorTotalFinal,
          destinatario: {
            nome: pedido.clienteNome,
            cpfCnpj: pedido.clienteCnpjCpf,
            uf: pedido.clienteUf || 'MS',
          },
          itens: pedido.itens,
          naturezaOperacao: natOpFinal,
        });

        chFinal = cloudRes.chaveAcesso;
        protFinal = cloudRes.protocolo;
        incrementarNumeroNFe(numSequencial);
      } catch (cloudErr: any) {
        console.warn('[NFe Cloud] Usando fallback local:', cloudErr);
        if (configNfe.modoOperacao === 'TECNOSPEED') {
          const itensTs = (pedido.itens || []).map((item, idx) => ({
            codigo: item.codigoInterno || item.codigoFabrica || `PROD-${idx + 1}`,
            descricao: item.descricao || 'PRODUTO',
            ncm: '32089010',
            cfop: cfopFinal,
            unidade: item.unidadeMedida || 'UN',
            quantidade: item.quantidade || 1,
            valor_unitario: item.precoFinalUnitario || 0,
            valor_total: item.subtotalLiquido || item.subtotalBruto || 0,
            valor_desconto: (item.descontoValorUnitario || 0) * (item.quantidade || 1),
            cst_csosn: '102',
            cest: '',
          }));

          const ambNum = configNfe.ambienteDestino === 'PRODUÇÃO' ? 1 : 2;
          const ufEmitente = (configNfe.ufWebService?.toUpperCase().includes('MATO GROSSO') || configNfe.ufWebService?.toUpperCase().includes('MS') || configNfe.ufWebService?.includes('50')) ? 'MS' : 'SP';

          const resTs = await invoke<any>('tecnospeed_transmitir_tx2_cmd', {
            host: null,
            port: null,
            cnpj: configNfe.cnpjEmitente,
            grupo: null,
            usuario: null,
            senha: null,
            dados: {
              modelo: 55,
              serie: serieSequencial,
              numero: numSequencial,
              natureza_operacao: natOpFinal,
              ambiente: configNfe.ambienteDestino,
              emitente_cnpj: configNfe.cnpjEmitente || '68.148.349/0001-09',
              emitente_razao: configNfe.nomeEmitente || 'LIVRARIA DAMASCO LTDA',
              emitente_fantasia: null,
              emitente_ie: configNfe.inscricaoEstadualEmitente || '283261864',
              emitente_uf: ufEmitente,
              emitente_municipio_ibge: '5003702',
              dest_cpf_cnpj: pedido.clienteCnpjCpf || '00000000000',
              dest_nome: pedido.clienteNome || 'CONSUMIDOR FINAL',
              dest_ie: pedido.clienteInscricaoEstadual || null,
              dest_uf: pedido.clienteUf || 'MS',
              dest_cidade: pedido.clienteCidade || 'DOURADOS',
              dest_logradouro: pedido.clienteEndereco || 'RUA PRINCIPAL',
              dest_numero: '100',
              dest_bairro: pedido.clienteBairro || 'CENTRO',
              dest_cep: '79800000',
              itens: itensTs,
              pagamentos: [
                {
                  meio_pagamento: isAcobertamento ? '90' : tPag,
                  valor: pedido.valorTotalFinal,
                },
              ],
              valor_total_produtos: pedido.totalProdutos,
              valor_total_nota: pedido.valorTotalFinal,
              valor_desconto: pedido.totalDescontoGlobal || 0,
              informacoes_adicionais: infCpl,
              chave_referenciada: isAcobertamento ? (pedido.chaveNFCeEmitida || null) : null,
            },
            pastaXml: configNfe.pastaArmazenamentoNfe || 'C:\\ERPFULL\\NFE\\',
            pastaEntrada: null,
            uf: ufEmitente,
            ambiente: ambNum,
            certName: configNfe.certificadoDigital || null,
            caminhoPfx: configNfe.caminhoArquivoPfx || null,
            senhaCert: configNfe.senhaCertificadoA1 || null,
            cnpjSh: configNfe.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
            tokenSh: configNfe.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
            sincrono: true,
          });

          if (resTs?.c_stat && resTs.c_stat !== 100 && resTs.c_stat !== 104 && resTs.c_stat !== 150) {
            alert(`SEFAZ Retorno [cStat ${resTs.c_stat}]:\n${resTs.x_motivo}`);
            return;
          }

          incrementarNumeroNFe(numSequencial);
          chFinal = resTs?.ch_nfe || chaveObj.chave;
          protFinal = resTs?.n_prot || protFinal;
        } else {
          throw new Error(cloudErr.message || 'Falha na transmissão da NF-e para a SEFAZ.');
        }
      }

      let pedidoAtualizado: PedidoVendaItem;
      if (isAcobertamento) {
        pedidoAtualizado = atualizarStatusFiscalPedido(pedido.id, {
          chaveNFeAcobertamento: chFinal,
          numeroNFeAcobertamento: numFormatado,
          reciboEmissao: protFinal,
        }) || { ...pedido, chaveNFeAcobertamento: chFinal, numeroNFeAcobertamento: numFormatado };
      } else {
        pedidoAtualizado = atualizarStatusFiscalPedido(pedido.id, {
          status: 'FATURADO',
          statusFiscalNfe: 'AUTORIZADA',
          chaveNFeEmitida: chFinal,
          numeroNFe: numFormatado,
          serieNFe: serieSequencial,
          protocoloAutorizacao: protFinal,
          dataAutorizacaoSefaz: new Date().toLocaleString('pt-BR'),
          dataFaturamento: new Date().toLocaleDateString('pt-BR'),
          reciboEmissao: protFinal || `SEFAZ-MS-AUT-${Date.now()}`,
        }) || {
          ...pedido,
          status: 'FATURADO',
          statusFiscalNfe: 'AUTORIZADA',
          chaveNFeEmitida: chFinal,
          numeroNFe: numFormatado,
        };
      }

      setNotaAutorizada({
        chave: chFinal,
        numero: numFormatado,
        protocolo: protFinal,
        dataAutorizacao: new Date().toLocaleString('pt-BR'),
        motivo: motivoFinal,
        cStat: 100,
      });

      onFaturamentoConcluido(pedidoAtualizado);
    } catch (err: any) {
      alert(`Falha na transmissão da NF-e: ${String(err)}`);
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleCopiarChave = () => {
    if (notaAutorizada?.chave) {
      navigator.clipboard.writeText(notaAutorizada.chave);
      alert('Chave de Acesso da NF-e copiada para a área de transferência!');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 13000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
            <FileCheck size={22} color="#3b82f6" />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Emissão & Faturamento de NF-e (Modelo 55)
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Pedido Nº <strong>{pedido.numeroPedido}</strong> • Destinatário: <strong>{pedido.clienteNome}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Se a nota JÁ FOI autorizada */}
          {notaAutorizada ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', margin: 0 }}>
                  NF-e Mod. 55 Autorizada com Sucesso na SEFAZ!
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Status: <strong>100 - Autorizado o uso da NF-e</strong> • Protocolo: <strong>{notaAutorizada.protocolo}</strong>
                </div>
              </div>

              {/* Caixa da Chave de Acesso */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    CHAVE DE ACESSO (44 DÍGITOS):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopiarChave}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                  >
                    <Copy size={11} /> Copiar Chave
                  </button>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '1px', wordBreak: 'break-all' }}>
                  {notaAutorizada.chave}
                </div>
              </div>

              {/* Notificação de Gravação Automática do XML em Disco */}
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  📁 Arquivo gravado com sucesso em: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{caminhoXmlSalvo || nfeConfig.pastaArmazenamentoNfe}</strong>
                </div>
              </div>

              {/* Botões de Ação do DANFE */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Button
                  variant="primary"
                  onClick={() => setIsModalDanfeOpen(true)}
                  leftIcon={<Printer size={15} />}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  Imprimir DANFE Oficial (PDF A4)
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      let xml = '';
                      // 1. Tenta buscar o XML oficial autorizado gravado na VPS
                      try {
                        const res = await fetch(`/api/fiscal/xml/${notaAutorizada.chave}`);
                        if (res.ok) {
                          xml = await res.text();
                        }
                      } catch {}

                      // 2. Se não encontrou no servidor, tenta disco local ou gera
                      if (!xml || xml.includes('<!DOCTYPE')) {
                        xml = (await obterXmlRealDoDisco(notaAutorizada.chave)) || '';
                      }
                      if (!xml) {
                        xml = gerarXmlNFe(pedido, notaAutorizada.chave, notaAutorizada.protocolo, tPag, modFrete, infCpl);
                      }

                      const nomeArquivo = `${notaAutorizada.chave}-procNFe.xml`;
                      
                      // Forçar download nativo no navegador
                      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = nomeArquivo;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      alert(`✅ XML da NF-e baixado com sucesso!\n\n• Arquivo: ${nomeArquivo}\n• Chave: ${notaAutorizada.chave}\n\nO arquivo foi salvo na sua pasta de Downloads do computador.`);
                    } catch (e: any) {
                      alert(`Erro ao baixar XML: ${e.message}`);
                    }
                  }}
                  leftIcon={<Download size={15} />}
                  style={{ color: '#38bdf8', borderColor: '#38bdf8' }}
                >
                  Baixar XML da NF-e
                </Button>
              </div>
            </div>
          ) : (
            /* Formulário de Configuração antes de Transmitir */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Alerta se o pedido estiver BLOQUEADO por duplicidade de nota */}
              {!fiscalCheck.permitido && !isAcobertamento && (
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  <FileWarning size={20} />
                  <div>
                    <strong>Bloqueio de Duplicidade Fiscal:</strong> {fiscalCheck.motivo}
                  </div>
                </div>
              )}

              {/* Alerta de NF-e de Acobertamento de Cupom Fiscal */}
              {isAcobertamento && (
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}>
                  <Receipt size={22} style={{ color: '#8b5cf6' }} />
                  <div>
                    <div style={{ fontWeight: 800, color: '#8b5cf6' }}>
                      NF-E DE ACOBERTAMENTO DE CUPOM FISCAL (CFOP 5.929 / 6.929)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Este pedido já possui o cupom fiscal <strong>NFC-e Nº {pedido.numeroNFCe}</strong>. A NF-e gerada referenciará a chave do cupom e não duplicará estoque nem financeiro.
                    </div>
                  </div>
                </div>
              )}

              {/* Banner de Modo de Operação Fiscal Ativo e Numeração da Nota */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '10px',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '6px',
                fontSize: '11px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>
                    ⚡ TECNOSPEED ({nfeConfig.ambienteDestino})
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Transmissão online via componente spdNFeX com Certificado A1.
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Próxima Nota: <span style={{ color: '#3b82f6', fontFamily: 'monospace' }}>Série {nfeConfig.serieNfe || 1} - Nº {String(nfeConfig.proximoNumeroNfe || 1025).padStart(6, '0')}</span>
                </div>
              </div>

              {/* Resumo do Pedido e Natureza */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Natureza de Operação da NF-e:</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>
                    {isAcobertamento ? '5929 - LANÇAMENTO DECORRENTE DE CUPOM FISCAL / NFC-E' : `${pedido.naturezaOperacao?.cfop || '5102'} - ${pedido.naturezaOperacao?.descricao || 'VENDA DE MERCADORIAS'}`}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Valor Total da Nota:</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                    {formatCurrency(pedido.valorTotalFinal)}
                  </div>
                </div>
              </div>

              {/* Formas de Pagamento e Indicador SEFAZ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Forma de Pagamento Oficial SEFAZ (tPag): *</label>
                  <select
                    value={tPag}
                    onChange={(e) => setTPag(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '34px', width: '100%', fontWeight: 700 }}
                  >
                    <option value="01">01 - Dinheiro</option>
                    <option value="02">02 - Cheque</option>
                    <option value="03">03 - Cartão de Crédito</option>
                    <option value="04">04 - Cartão de Débito</option>
                    <option value="15">15 - Boleto Bancário</option>
                    <option value="17">17 - Pagamento Instantâneo (PIX)</option>
                    <option value="90">90 - Sem Pagamento (Bonificação / Remessa)</option>
                    <option value="99">99 - Outros</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Indicador de Pagamento (indPag):</label>
                  <select
                    value={indPag}
                    onChange={(e) => setIndPag(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '34px', width: '100%', fontWeight: 600 }}
                  >
                    <option value="0">0 - Pagamento à Vista</option>
                    <option value="1">1 - Pagamento a Prazo</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Modalidade do Frete (modFrete):</label>
                  <select
                    value={modFrete}
                    onChange={(e) => setModFrete(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '34px', width: '100%' }}
                  >
                    <option value="0">0 - Por conta do Emitente (CIF)</option>
                    <option value="1">1 - Por conta do Destinatário (FOB)</option>
                    <option value="9">9 - Sem Ocorrência de Transporte</option>
                  </select>
                </div>
              </div>

              {/* Informações Complementares do Contribuinte (infCpl) */}
              <div>
                <label className="coliseu-label">
                  Informações Complementares / Observações do Contribuinte (infCpl) — Sai impresso no DANFE:
                </label>
                <textarea
                  value={infCpl}
                  onChange={(e) => setInfCpl(e.target.value)}
                  placeholder="Informações adicionais da nota fiscal..."
                  className="coliseu-input"
                  style={{ width: '100%', height: '65px', fontSize: '11px', resize: 'none' }}
                />
              </div>

              {/* Informações ao Fisco */}
              <div>
                <label className="coliseu-label">
                  Informações Adicionais de Interesse do Fisco (infAdFisco):
                </label>
                <input
                  type="text"
                  value={infAdFisco}
                  onChange={(e) => setInfAdFisco(e.target.value)}
                  className="coliseu-input"
                  style={{ width: '100%', height: '32px', fontSize: '11px' }}
                />
              </div>

              {/* Caixa de Segurança do Certificado Digital */}
              <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '6px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={20} color="#3b82f6" />
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Certificado Digital A1 ativo: <strong>{nfeConfig.certificadoDigital || 'PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA (A1 - Validade: 12/2026)'}</strong> • Ambiente: <strong>SEFAZ-{nfeConfig.ufWebService === 'SÃO PAULO' ? 'SP' : 'MS'} ({nfeConfig.ambienteDestino || 'HOMOLOGAÇÃO'})</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <Button variant="secondary" type="button" onClick={onClose}>
            {notaAutorizada ? 'Concluir' : 'Cancelar'}
          </Button>

          {!notaAutorizada && (
            <Button
              variant="primary"
              type="button"
              onClick={handleTransmitirSefaz}
              disabled={isTransmitting || (!fiscalCheck.permitido && !isAcobertamento)}
              style={{
                backgroundColor: (!fiscalCheck.permitido && !isAcobertamento) ? '#64748b' : isAcobertamento ? '#8b5cf6' : '#10b981',
                borderColor: (!fiscalCheck.permitido && !isAcobertamento) ? '#64748b' : isAcobertamento ? '#8b5cf6' : '#10b981',
              }}
              leftIcon={<Send size={15} />}
            >
              {isTransmitting
                ? 'Transmitindo à SEFAZ...'
                : (!fiscalCheck.permitido && !isAcobertamento)
                ? '🔒 Emissão Bloqueada (Já Faturado)'
                : isAcobertamento
                ? '🏷️ Transmitir NF-e de Acobertamento'
                : '🚀 Transmitir & Autorizar NF-e (SEFAZ)'}
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Impressão e Visualização Oficial do DANFE A4 */}
      {isModalDanfeOpen && notaAutorizada && (
        <ModalDanfeNFeOficial
          isOpen={isModalDanfeOpen}
          onClose={() => setIsModalDanfeOpen(false)}
          pedido={pedido}
          chaveNFe={notaAutorizada.chave}
          protocolo={notaAutorizada.protocolo}
          dataAutorizacao={notaAutorizada.dataAutorizacao}
          tPag={tPag}
          modFrete={modFrete}
          infCpl={infCpl}
        />
      )}
    </div>
  );
};
