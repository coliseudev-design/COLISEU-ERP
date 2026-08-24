import React, { useState, useRef, useEffect } from 'react';
import {
  Barcode,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Search,
  PackageCheck,
  FileCheck,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';

export interface ItemConferencia {
  seq: number;
  codigoFornecedor: string;
  ean: string;
  descricao: string;
  unidade: string;
  qtdEsperadaXml: number;
  qtdBipada: number;
}

interface ConferenciaCegaModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroNota: string;
  fornecedorNome: string;
  itens: Array<{
    seq: number;
    codigoFornecedor: string;
    ean: string;
    descricao: string;
    unidade: string;
    quantidade: number;
  }>;
  onConferenciaConcluida: (relatorio: {
    status: '100%_conferido' | 'com_divergencia';
    totalEsperado: number;
    totalBipado: number;
    itensDivergentes: ItemConferencia[];
  }) => void;
}

export const ConferenciaCegaModal: React.FC<ConferenciaCegaModalProps> = ({
  isOpen,
  onClose,
  numeroNota,
  fornecedorNome,
  itens,
  onConferenciaConcluida,
}) => {
  const [bipInput, setBipInput] = useState('');
  const [itensConferencia, setItensConferencia] = useState<ItemConferencia[]>([]);
  const [ultimoBipItem, setUltimoBipItem] = useState<string | null>(null);
  const [alertaBip, setAlertaBip] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Inicializar itens de conferência
  useEffect(() => {
    if (isOpen && itens.length > 0) {
      setItensConferencia(
        itens.map((it) => ({
          seq: it.seq,
          codigoFornecedor: it.codigoFornecedor,
          ean: it.ean,
          descricao: it.descricao,
          unidade: it.unidade,
          qtdEsperadaXml: it.quantidade,
          qtdBipada: 0,
        }))
      );
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, itens]);

  if (!isOpen) return null;

  // Processar Bipagem (Leitor de Código de Barras)
  const handleBipar = (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = bipInput.trim().toUpperCase();
    if (!codigo) return;

    // Localizar item por EAN, Código do Fornecedor ou seq
    const idx = itensConferencia.findIndex((it) => {
      const eanClean = (it.ean || '').toUpperCase().trim();
      const codClean = (it.codigoFornecedor || '').toUpperCase().trim();
      return (eanClean && eanClean === codigo) || codClean === codigo || String(it.seq) === codigo;
    });

    if (idx !== -1) {
      const itemAtual = itensConferencia[idx];
      const novaQtd = itemAtual.qtdBipada + 1;

      const updated = [...itensConferencia];
      updated[idx] = { ...itemAtual, qtdBipada: novaQtd };
      setItensConferencia(updated);
      setUltimoBipItem(itemAtual.descricao);

      if (novaQtd <= itemAtual.qtdEsperadaXml) {
        setAlertaBip({ tipo: 'sucesso', msg: `✓ +1 ${itemAtual.descricao} (${novaQtd}/${itemAtual.qtdEsperadaXml} ${itemAtual.unidade})` });
      } else {
        setAlertaBip({ tipo: 'erro', msg: `⚠️ SOBRA! Bipado ${novaQtd} de ${itemAtual.qtdEsperadaXml} esperados!` });
      }
    } else {
      setAlertaBip({ tipo: 'erro', msg: `❌ Código '${codigo}' NÃO CONSTA no XML desta NF-e!` });
    }

    setBipInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const ajustarQtdManual = (seq: number, delta: number) => {
    setItensConferencia((prev) =>
      prev.map((it) => {
        if (it.seq === seq) {
          const nova = Math.max(0, it.qtdBipada + delta);
          return { ...it, qtdBipada: nova };
        }
        return it;
      })
    );
  };

  const zerarTudo = () => {
    setItensConferencia((prev) => prev.map((it) => ({ ...it, qtdBipada: 0 })));
    setAlertaBip(null);
  };

  const preencherTudoAutomatico = () => {
    setItensConferencia((prev) => prev.map((it) => ({ ...it, qtdBipada: it.qtdEsperadaXml })));
    setAlertaBip({ tipo: 'sucesso', msg: '✓ Todos os itens preenchidos conforme o XML da nota.' });
  };

  // Métricas da Conferência
  const totalEsperado = itensConferencia.reduce((acc, it) => acc + it.qtdEsperadaXml, 0);
  const totalBipado = itensConferencia.reduce((acc, it) => acc + it.qtdBipada, 0);
  const itensConferidosOk = itensConferencia.filter((it) => it.qtdBipada === it.qtdEsperadaXml).length;
  const divergencias = itensConferencia.filter((it) => it.qtdBipada !== it.qtdEsperadaXml);
  const percentualProgresso = totalEsperado > 0 ? Math.min(100, Math.round((totalBipado / totalEsperado) * 100)) : 0;

  const handleFinalizar = () => {
    onConferenciaConcluida({
      status: divergencias.length === 0 ? '100%_conferido' : 'com_divergencia',
      totalEsperado,
      totalBipado,
      itensDivergentes: divergencias,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 10500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
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
              <Barcode size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Conferência Cega / Bipagem de Recebimento Físico
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                NF-e Nº {numeroNota} • Fornecedor: {fornecedorNome}
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
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Bipagem Rápida */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleBipar} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Barcode
                size={18}
                style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--primary)' }}
              />
              <input
                ref={inputRef}
                type="text"
                value={bipInput}
                onChange={(e) => setBipInput(e.target.value)}
                placeholder="Bipe o código de barras (EAN), código do fornecedor ou digite e pressione ENTER..."
                className="coliseu-input"
                style={{
                  paddingLeft: '38px',
                  height: '40px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderColor: 'var(--primary)',
                }}
                autoFocus
              />
            </div>

            <Button variant="primary" type="submit" style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}>
              Registrar Bip
            </Button>

            <Button variant="secondary" type="button" onClick={preencherTudoAutomatico} style={{ height: '40px', fontSize: '12px' }}>
              ✓ Conferir Todos
            </Button>
          </form>

          {/* Feedback de Alerta da Bipagem */}
          {alertaBip && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: alertaBip.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: alertaBip.tipo === 'sucesso' ? '#10b981' : '#ef4444',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {alertaBip.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {alertaBip.msg}
            </div>
          )}
        </div>

        {/* Barra de Progresso e Métricas */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--surface-1)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>
              Total Esperado (XML): <strong>{totalEsperado} un</strong>
            </span>
            <span>
              Total Bipado (Físico): <strong style={{ color: totalBipado === totalEsperado ? '#10b981' : '#f59e0b' }}>{totalBipado} un</strong>
            </span>
            <span>
              Itens 100% OK: <strong>{itensConferidosOk} de {itensConferencia.length}</strong>
            </span>
          </div>

          <div style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${percentualProgresso}%`,
                  height: '100%',
                  backgroundColor: divergencias.length === 0 && percentualProgresso === 100 ? '#10b981' : '#3b82f6',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{percentualProgresso}%</span>
          </div>
        </div>

        {/* Tabela de Itens para Conferência */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ width: '90px' }}>Cód. / EAN</th>
                <th>Descrição do Produto</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Qtd XML</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Qtd Bipada</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itensConferencia.map((it) => {
                const isOk = it.qtdBipada === it.qtdEsperadaXml;
                const isSobra = it.qtdBipada > it.qtdEsperadaXml;
                const isFalta = it.qtdBipada < it.qtdEsperadaXml;

                return (
                  <tr
                    key={it.seq}
                    style={{
                      backgroundColor: isOk
                        ? 'rgba(16, 185, 129, 0.05)'
                        : isSobra
                        ? 'rgba(239, 68, 68, 0.06)'
                        : 'transparent',
                    }}
                  >
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{it.seq}</td>
                    <td>
                      <div style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>{it.codigoFornecedor}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{it.ean || 'SEM GTIN'}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{it.descricao}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {it.qtdEsperadaXml} {it.unidade}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: isOk ? '#10b981' : isSobra ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {it.qtdBipada} {it.unidade}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isOk && (
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> Conferido
                        </span>
                      )}
                      {isFalta && (
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                          Faltam {it.qtdEsperadaXml - it.qtdBipada}
                        </span>
                      )}
                      {isSobra && (
                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
                          Sobra +{it.qtdBipada - it.qtdEsperadaXml}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => ajustarQtdManual(it.seq, -1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            background: 'var(--surface-2)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => ajustarQtdManual(it.seq, 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            background: 'var(--surface-2)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé do Modal */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <button
            type="button"
            onClick={zerarTudo}
            className="coliseu-btn coliseu-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center' }}
          >
            <RotateCcw size={13} /> Reiniciar Contagem
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="coliseu-btn coliseu-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              Cancelar
            </button>

            <Button
              variant="primary"
              onClick={handleFinalizar}
              style={{ padding: '8px 20px', fontSize: '12px', fontWeight: 600, display: 'flex', gap: '6px' }}
            >
              <PackageCheck size={16} /> Concluir Conferência Física
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
