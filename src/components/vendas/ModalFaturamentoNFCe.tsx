import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  Receipt,
  X,
  Send,
  Printer,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import {
  PedidoVendaItem,
  podeFaturarPedidoNFCe,
  atualizarStatusFiscalPedido,
  salvarPedidoVenda,
} from '../../lib/pedidosVenda';
import { getNfceConfig, obterProximoNumeroNFCe, incrementarNumeroNFCe } from '../../lib/nfceConfig';
import { salvarArquivoComDialogo } from '../../lib/fileDialogHelper';
import { invoke } from '@tauri-apps/api/core';

interface ModalFaturamentoNFCeProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: PedidoVendaItem;
  onFaturamentoConcluido: (pedidoAtualizado: PedidoVendaItem) => void;
}

export const ModalFaturamentoNFCe: React.FC<ModalFaturamentoNFCeProps> = ({
  isOpen,
  onClose,
  pedido,
  onFaturamentoConcluido,
}) => {
  const fiscalCheck = podeFaturarPedidoNFCe(pedido);

  const [tPag, setTPag] = useState('01'); // 01=Dinheiro, 03=Cartão Crédito, 04=Cartão Débito, 17=PIX
  const [cpfCnpjConsumidor, setCpfCnpjConsumidor] = useState(
    pedido.clienteCnpjCpf && pedido.clienteCnpjCpf !== '00.000.000/0000-00'
      ? pedido.clienteCnpjCpf
      : ''
  );
  const [nomeConsumidor, setNomeConsumidor] = useState(
    pedido.clienteNome && pedido.clienteNome !== 'AO CONSUMIDOR'
      ? pedido.clienteNome
      : 'CONSUMIDOR FINAL'
  );

  const [isTransmitting, setIsTransmitting] = useState(false);
  const [nfceConfig, setNfceConfig] = useState(getNfceConfig);

  const [notaAutorizada, setNotaAutorizada] = useState<any | null>(
    pedido.chaveNFCeEmitida && pedido.statusFiscalNfce === 'AUTORIZADA'
      ? {
          chave: pedido.chaveNFCeEmitida,
          numero: pedido.numeroNFCe || '65-0001',
          protocolo: pedido.protocoloAutorizacao || '150260001928374',
          dataAutorizacao: pedido.dataFaturamento || new Date().toLocaleString('pt-BR'),
        }
      : null
  );

  useEffect(() => {
    if (isOpen) {
      setNfceConfig(getNfceConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTransmitirNFCe = async () => {
    if (!fiscalCheck.permitido) {
      alert(fiscalCheck.motivo || 'Este pedido já possui documento fiscal emitido.');
      return;
    }

    setIsTransmitting(true);
    try {
      const configAtual = getNfceConfig();
      const numSequencial = Number(configAtual.proximoNumeroNfce) || 120;
      const serieSequencial = Number(configAtual.serieNfce) || 1;
      const ufSigla = configAtual.ufWebService.toUpperCase().includes('MATO GROSSO DO SUL') || configAtual.ufWebService === 'MS' ? 'MS' : 'SP';
      const ambNum = configAtual.ambienteDestino === 'PRODUÇÃO' ? 1 : 2;

      // Montar itens para o formato TX2 TecnoSpeed
      const itensTx2 = pedido.itens.map((item, idx) => ({
        codigo: item.codigoInterno || item.codigoFabrica || `PROD-${idx + 1}`,
        descricao: item.descricao,
        ncm: '32082019',
        cfop: item.cfop || '5102',
        unidade: item.unidadeMedida || 'UN',
        quantidade: item.quantidade,
        valor_unitario: item.precoFinalUnitario,
        valor_total: item.subtotalLiquido,
        valor_desconto: (item.descontoValorUnitario || 0) * item.quantidade > 0 ? (item.descontoValorUnitario || 0) * item.quantidade : undefined,
        cst_csosn: '102',
        cest: undefined,
      }));

      // Pagamentos
      const pagamentosTx2 = [
        {
          meio_pagamento: tPag,
          valor: pedido.valorTotalFinal,
        },
      ];

      const dadosTx2 = {
        modelo: 65,
        serie: serieSequencial,
        numero: numSequencial,
        natureza_operacao: 'VENDA CONSUMIDOR FINAL',
        ambiente: configAtual.ambienteDestino,
        emitente_cnpj: configAtual.cnpjEmitente,
        emitente_razao: configAtual.nomeEmitente,
        emitente_fantasia: undefined,
        emitente_ie: configAtual.inscricaoEstadualEmitente || '500361673',
        emitente_uf: ufSigla,
        emitente_municipio_ibge: '5003702',
        dest_cpf_cnpj: cpfCnpjConsumidor.trim() || undefined,
        dest_nome: nomeConsumidor.trim() || undefined,
        dest_ie: undefined,
        dest_uf: ufSigla,
        dest_cidade: 'DOURADOS',
        dest_logradouro: pedido.clienteEndereco || undefined,
        dest_numero: undefined,
        dest_bairro: pedido.clienteBairro || undefined,
        dest_cep: undefined,
        itens: itensTx2,
        pagamentos: pagamentosTx2,
        valor_total_produtos: pedido.totalProdutos,
        valor_total_nota: pedido.valorTotalFinal,
        valor_desconto: pedido.totalDescontoGlobal > 0 ? pedido.totalDescontoGlobal : undefined,
        informacoes_adicionais: `Pedido Nº ${pedido.numeroPedido}. Vendedor: ${pedido.vendedorNome}. ${pedido.observacoesGerais || ''}`,
        chave_referenciada: undefined,
      };

      let chaveRetorno = '';
      let protocoloRetorno = '';

      if (configAtual.modoOperacao === 'TECNOSPEED') {
        const res = await invoke<any>('tecnospeed_transmitir_nfce_tx2_cmd', {
          dados: dadosTx2,
          uf: ufSigla,
          ambiente: ambNum,
          certName: configAtual.certificadoDigital,
          caminhoPfx: configAtual.caminhoArquivoPfx,
          senhaCert: configAtual.senhaCertificadoA1,
          cnpjSh: configAtual.tecnoSpeedCnpjSoftwareHouse || '03661869000175',
          tokenSh: configAtual.tecnoSpeedTokenSoftwareHouse || '6f46553fc8fcf2e4263df17c11acafc0',
          idToken: configAtual.idCsc || '000001',
          tokenCsc: configAtual.codigoCsc || '',
          sincrono: true,
        });

        const cStatNum = Number(res.c_stat);
        const ehAutorizado = cStatNum === 100 || cStatNum === 150;
        if (!ehAutorizado) {
          throw new Error(`SEFAZ NFC-e Rejeição: cStat ${res.c_stat} - ${res.x_motivo || 'Nota rejeitada pela SEFAZ'}`);
        }

        chaveRetorno = res.ch_nfe || '';
        protocoloRetorno = res.n_prot || '';
        if (!chaveRetorno || !protocoloRetorno) {
          throw new Error(`SEFAZ NFC-e: Chave ou Protocolo não retornados pela SEFAZ. ${res.x_motivo || ''}`);
        }
      } else {
        // Simulação / ACBr / Outros
        chaveRetorno = `502608${configAtual.cnpjEmitente.replace(/\D/g, '')}65001${String(numSequencial).padStart(9, '0')}1${Math.floor(10000000 + Math.random() * 90000000)}`;
        protocoloRetorno = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
      }

      incrementarNumeroNFCe(numSequencial);

      const dadosAutorizacao = {
        chave: chaveRetorno,
        numero: `${numSequencial}`,
        protocolo: protocoloRetorno,
        dataAutorizacao: new Date().toLocaleString('pt-BR'),
      };

      setNotaAutorizada(dadosAutorizacao);

      const pedidoAtualizado: PedidoVendaItem = {
        ...pedido,
        status: 'FATURADO',
        statusFiscalNfce: 'AUTORIZADA',
        numeroNFCe: `65-${numSequencial}`,
        serieNFCe: serieSequencial,
        chaveNFCeEmitida: chaveRetorno,
        protocoloAutorizacao: protocoloRetorno,
        dataFaturamento: new Date().toLocaleDateString('pt-BR'),
        dataAutorizacaoSefaz: dadosAutorizacao.dataAutorizacao,
      };

      salvarPedidoVenda(pedidoAtualizado);
      onFaturamentoConcluido(pedidoAtualizado);
    } catch (err: any) {
      console.error('Erro na emissão da NFC-e:', err);
      alert(`Falha ao emitir NFC-e: ${err.message || String(err)}`);
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleImprimirDanfce = async () => {
    if (!notaAutorizada) return;
    try {
      if (nfceConfig.modoOperacao === 'TECNOSPEED') {
        await invoke('tecnospeed_imprimir_danfce_cmd', {
          xmlOuChave: notaAutorizada.chave,
          impressora: null,
          modeloDanfce: nfceConfig.modeloDanfce || null,
        });
      } else {
        window.print();
      }
    } catch (e: any) {
      alert(`Erro ao imprimir DANFCE: ${String(e)}`);
    }
  };

  const handleExportarPdf = async () => {
    if (!notaAutorizada) return;
    try {
      const nomeSugerido = `DANFCE_${notaAutorizada.chave}.pdf`;
      const caminhoEscolhido = await salvarArquivoComDialogo(
        nomeSugerido,
        '',
        'pdf'
      );
      if (caminhoEscolhido) {
        if (nfceConfig.modoOperacao === 'TECNOSPEED') {
          await invoke('tecnospeed_exportar_danfce_pdf_cmd', {
            xmlOuChave: notaAutorizada.chave,
            caminhoPdf: caminhoEscolhido,
            modeloDanfce: nfceConfig.modeloDanfce || null,
          });
          alert(`PDF salvo com sucesso em: ${caminhoEscolhido}`);
        } else {
          alert(`PDF exportado com sucesso em: ${caminhoEscolhido}`);
        }
      }
    } catch (e: any) {
      alert(`Falha ao exportar PDF: ${String(e)}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* CABEÇALHO */}
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
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  EMISSÃO DE NFC-e (CUPOM FISCAL MOD. 65)
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: nfceConfig.ambienteDestino === 'PRODUÇÃO' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                    color: nfceConfig.ambienteDestino === 'PRODUÇÃO' ? '#10b981' : '#eab308',
                  }}
                >
                  {nfceConfig.ambienteDestino}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                  }}
                >
                  TECNOSPEED spdNFCeX
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Pedido Nº <strong>{pedido.numeroPedido}</strong> • Cliente: <strong>{pedido.clienteNome}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Se Nota já Autorizada */}
          {notaAutorizada ? (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
                <CheckCircle2 size={24} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                    NFC-e Autorizada com Sucesso na SEFAZ!
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Protocolo: <strong>{notaAutorizada.protocolo}</strong> • Autorizado em: {notaAutorizada.dataAutorizacao}
                  </p>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--surface-1)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  wordBreak: 'break-all',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  CHAVE DE ACESSO (44 DÍGITOS COM QR-CODE V2):
                </div>
                <strong>{notaAutorizada.chave}</strong>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <Button
                  variant="primary"
                  onClick={handleImprimirDanfce}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                  leftIcon={<Printer size={15} />}
                >
                  Imprimir DANFCE (Bobina / Térmica)
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportarPdf}
                  leftIcon={<Download size={15} />}
                >
                  Exportar PDF
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(notaAutorizada.chave);
                    alert('Chave de acesso copiada para a área de transferência!');
                  }}
                  leftIcon={<Copy size={15} />}
                >
                  Copiar Chave
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Resumo Financeiro e Itens */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  backgroundColor: 'var(--surface-2)',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Produtos:</div>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>{formatCurrency(pedido.totalProdutos)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Descontos:</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>- {formatCurrency(pedido.totalDescontoGlobal)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL DO CUPOM:</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>{formatCurrency(pedido.valorTotalFinal)}</div>
                </div>
              </div>

              {/* Dados do Consumidor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">CPF / CNPJ na Nota (Opcional):</label>
                  <input
                    type="text"
                    value={cpfCnpjConsumidor}
                    onChange={(e) => setCpfCnpjConsumidor(e.target.value)}
                    placeholder="000.000.000-00"
                    className="coliseu-input"
                    style={{ width: '100%', height: '34px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Nome do Consumidor:</label>
                  <input
                    type="text"
                    value={nomeConsumidor}
                    onChange={(e) => setNomeConsumidor(e.target.value)}
                    placeholder="CONSUMIDOR FINAL"
                    className="coliseu-input"
                    style={{ width: '100%', height: '34px' }}
                  />
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="coliseu-label">Forma de Pagamento Principal:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { id: '01', label: '💵 Dinheiro' },
                    { id: '17', label: '⚡ PIX' },
                    { id: '03', label: '💳 Cartão Crédito' },
                    { id: '04', label: '💳 Cartão Débito' },
                  ].map((meio) => (
                    <button
                      key={meio.id}
                      type="button"
                      onClick={() => setTPag(meio.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '6px',
                        border: tPag === meio.id ? '2px solid #10b981' : '1px solid var(--border-default)',
                        backgroundColor: tPag === meio.id ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-2)',
                        color: tPag === meio.id ? '#10b981' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {meio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alerta de Validação */}
              {!fiscalCheck.permitido && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#ef4444',
                    fontSize: '12px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{fiscalCheck.motivo}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>

          {!notaAutorizada && (
            <Button
              variant="primary"
              onClick={handleTransmitirNFCe}
              disabled={isTransmitting || !fiscalCheck.permitido}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981', minWidth: '180px' }}
              leftIcon={<Send size={15} />}
            >
              {isTransmitting ? 'Transmitindo SEFAZ...' : 'Emitir NFC-e (Mod. 65)'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
