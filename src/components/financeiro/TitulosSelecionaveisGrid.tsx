import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Search, CheckSquare, Square, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export interface Titulo {
  codigo: string;
  emissao: string;
  parcela: string;
  tipo: string; // 'R' or 'P'
  vencimento: string;
  valorTitulo: number;
  valorAtual: number;
  especie: string;
  status: string;
  pedido?: string;
  nf?: string;
  isVencido: boolean;
  dataQuitacao?: string;
}

export interface TitulosSelecionaveisGridProps {
  titulos: Titulo[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export const TitulosSelecionaveisGrid: React.FC<TitulosSelecionaveisGridProps> = ({
  titulos,
  selectedIds,
  onSelectionChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showValorInput, setShowValorInput] = useState(false);
  const [valorTarget, setValorTarget] = useState<number>(0);

  type SortField = 'codigo' | 'emissao' | 'parcela' | 'tipo' | 'vencimento' | 'valorTitulo' | 'valorAtual' | 'pedido' | 'especie' | 'status';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('vencimento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (label: string, field: SortField, style?: React.CSSProperties) => {
    const isSorted = sortField === field;
    return (
      <th
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          padding: '8px 4px',
          ...style,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSort(field);
        }}
        title={`Clique para ordenar por ${label}`}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            justifyContent: style?.textAlign === 'right' ? 'flex-end' : style?.textAlign === 'center' ? 'center' : 'flex-start',
            width: '100%',
          }}
        >
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp size={11} style={{ color: 'var(--action-primary)', flexShrink: 0 }} />
            ) : (
              <ArrowDown size={11} style={{ color: 'var(--action-primary)', flexShrink: 0 }} />
            )
          ) : (
            <ArrowUpDown size={10} style={{ opacity: 0.35, flexShrink: 0 }} />
          )}
        </div>
      </th>
    );
  };

  const filteredTitulos = useMemo(() => {
    let list = titulos;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = titulos.filter(
        (t) =>
          t.codigo.toLowerCase().includes(q) ||
          t.vencimento.toLowerCase().includes(q) ||
          (t.pedido && t.pedido.toLowerCase().includes(q)) ||
          (t.especie && t.especie.toLowerCase().includes(q)) ||
          t.status.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'codigo':
          valA = parseInt(a.codigo, 10) || a.codigo;
          valB = parseInt(b.codigo, 10) || b.codigo;
          break;
        case 'emissao':
          valA = a.emissao || '';
          valB = b.emissao || '';
          break;
        case 'parcela':
          valA = a.parcela || '';
          valB = b.parcela || '';
          break;
        case 'tipo':
          valA = a.tipo || '';
          valB = b.tipo || '';
          break;
        case 'vencimento':
          valA = a.vencimento || '';
          valB = b.vencimento || '';
          break;
        case 'valorTitulo':
          valA = a.valorTitulo || 0;
          valB = b.valorTitulo || 0;
          break;
        case 'valorAtual':
          valA = a.valorAtual || a.valorTitulo || 0;
          valB = b.valorAtual || b.valorTitulo || 0;
          break;
        case 'pedido':
          valA = a.pedido || '';
          valB = b.pedido || '';
          break;
        case 'especie':
          valA = (a.especie || '').toLowerCase();
          valB = (b.especie || '').toLowerCase();
          break;
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          break;
        default:
          valA = a.vencimento || '';
          valB = b.vencimento || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [titulos, searchTerm, sortField, sortDirection]);

  const handleSelectAll = () => {
    onSelectionChange(new Set(filteredTitulos.map((t) => t.codigo)));
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  const handleSelectVencidos = () => {
    const vencidos = titulos.filter((t) => t.isVencido).map((t) => t.codigo);
    const newSelection = new Set(selectedIds);
    vencidos.forEach((id) => newSelection.add(id));
    onSelectionChange(newSelection);
  };

  const handleSelectByValor = () => {
    let accumulated = 0;
    const newSelection = new Set<string>();
    for (const t of titulos) {
      if (accumulated + (t.valorAtual || t.valorTitulo) <= valorTarget) {
        accumulated += t.valorAtual || t.valorTitulo;
        newSelection.add(t.codigo);
      }
    }
    onSelectionChange(newSelection);
    setShowValorInput(false);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  const selectedTitulos = useMemo(() => titulos.filter((t) => selectedIds.has(t.codigo)), [titulos, selectedIds]);
  const subtotal = useMemo(() => selectedTitulos.reduce((acc, t) => acc + (t.valorTitulo || 0), 0), [selectedTitulos]);
  const totalAtualizado = useMemo(() => selectedTitulos.reduce((acc, t) => acc + (t.valorAtual || t.valorTitulo), 0), [selectedTitulos]);
  const jurosCalculados = Math.max(0, Math.round((totalAtualizado - subtotal) * 100) / 100);

  const allFilteredSelected =
    filteredTitulos.length > 0 && filteredTitulos.every((t) => selectedIds.has(t.codigo));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', minHeight: 0 }}>
      {/* Top Bar: Busca e Ações Rápidas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={handleSelectVencidos}>
            Marcar Vencidos
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSelectAll}>
            Marcar Todos
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDeselectAll}>
            Desmarcar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowValorInput(!showValorInput)}>
            Por Valor Máx.
          </Button>
          {showValorInput && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', backgroundColor: 'var(--surface-2)', padding: '2px 6px', borderRadius: 'var(--radius-xs)' }}>
              <input
                type="number"
                className="coliseu-input"
                style={{ height: '30px', width: '100px', fontSize: '11px' }}
                value={valorTarget || ''}
                onChange={(e) => setValorTarget(Number(e.target.value))}
                placeholder="R$ Máximo"
              />
              <Button variant="primary" size="sm" onClick={handleSelectByValor} style={{ height: '30px', padding: '0 8px' }}>
                OK
              </Button>
            </div>
          )}
        </div>

        {/* Campo de Busca Rápida na Tabela */}
        <div style={{ position: 'relative', width: '180px' }}>
          <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filtrar títulos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="coliseu-input"
            style={{ height: '30px', paddingLeft: '26px', fontSize: '11px', width: '100%' }}
          />
        </div>
      </div>

      {/* Tabela de Títulos com Scroll e Sticky Header */}
      <div
        className="coliseu-table-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          minHeight: '260px',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xs)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <table className="coliseu-table" style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--surface-2)' }}>
            <tr>
              <th style={{ width: '35px', textAlign: 'center', padding: '8px 4px' }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => (e.target.checked ? handleSelectAll() : handleDeselectAll())}
                  style={{ cursor: 'pointer', accentColor: 'var(--action-primary)' }}
                />
              </th>
              {renderSortHeader('Código', 'codigo', { width: '75px', textAlign: 'left' })}
              {renderSortHeader('Emissão', 'emissao', { width: '85px', textAlign: 'left' })}
              {renderSortHeader('Parc.', 'parcela', { width: '45px', textAlign: 'center' })}
              {renderSortHeader('R/P', 'tipo', { width: '40px', textAlign: 'center' })}
              {renderSortHeader('Vencimento', 'vencimento', { width: '95px', textAlign: 'left' })}
              {renderSortHeader('Valor Título', 'valorTitulo', { width: '100px', textAlign: 'right' })}
              {renderSortHeader('Valor Atual', 'valorAtual', { width: '100px', textAlign: 'right' })}
              {renderSortHeader('Pedido', 'pedido', { width: '85px', textAlign: 'left' })}
              {renderSortHeader('Espécie', 'especie', { width: '120px', textAlign: 'left' })}
              {renderSortHeader('Status', 'status', { width: '90px', textAlign: 'center' })}
            </tr>
          </thead>
          <tbody>
            {filteredTitulos.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Nenhum título encontrado com o filtro informado.
                </td>
              </tr>
            ) : (
              filteredTitulos.map((t) => {
                const isSelected = selectedIds.has(t.codigo);
                return (
                  <tr
                    key={t.codigo}
                    onClick={() => toggleSelection(t.codigo)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected
                        ? 'var(--surface-selected)'
                        : t.isVencido
                        ? 'rgba(239, 68, 68, 0.05)'
                        : undefined,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ textAlign: 'center', padding: '6px 4px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(t.codigo)}
                        style={{ cursor: 'pointer', accentColor: 'var(--action-primary)' }}
                      />
                    </td>
                    <td className="text-mono" style={{ fontWeight: 600, color: 'var(--text-link)' }}>
                      {t.codigo}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }} className="tabular-nums">{formatDate(t.emissao)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t.parcela}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: t.tipo === 'R' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                      {t.tipo}
                    </td>
                    <td
                      style={{
                        fontWeight: t.isVencido ? 700 : 500,
                        color: t.isVencido ? 'var(--status-danger)' : 'var(--text-primary)',
                      }}
                      className="tabular-nums"
                    >
                      {formatDate(t.vencimento)}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 500 }}>
                      {formatCurrency(t.valorTitulo)}
                    </td>
                    <td
                      className="tabular-nums"
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: t.isVencido ? 'var(--status-danger)' : 'var(--text-primary)',
                      }}
                    >
                      {formatCurrency(t.valorAtual || t.valorTitulo)}
                    </td>
                    <td style={{ color: 'var(--text-link)' }}>{t.pedido || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{t.especie || 'BOLETO BANCARIO'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge
                        status={t.status === 'Pago' ? 'success' : t.isVencido ? 'danger' : 'warning'}
                        label={t.status}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer com Resumo da Seleção Atual */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: 'var(--surface-2)',
          borderRadius: 'var(--radius-xs)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <strong>{selectedIds.size}</strong> título(s) selecionado(s) de <strong>{titulos.length}</strong>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>
            Subtotal: <strong className="tabular-nums">{formatCurrency(subtotal)}</strong>
          </span>
          {jurosCalculados > 0 && (
            <span>
              Juros/Mora: <strong className="tabular-nums" style={{ color: 'var(--status-danger)' }}>{formatCurrency(jurosCalculados)}</strong>
            </span>
          )}
          <span>
            Total Atualizado:{' '}
            <strong className="tabular-nums" style={{ color: 'var(--status-success)', fontSize: '13px' }}>
              {formatCurrency(totalAtualizado)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
