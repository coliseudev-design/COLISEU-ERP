import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableEnterpriseProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  batchActions?: React.ReactNode;
  title?: string;
}

export function DataTableEnterprise<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
  isLoading = false,
  onRowClick,
  batchActions,
  title,
}: DataTableEnterpriseProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<'compact' | 'normal' | 'comfortable'>('normal');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 1. Filtragem global
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, columns, searchTerm]);

  // 2. Ordenação
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  // 3. Paginação
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === paginatedData.length) {
      setSelectedKeys(new Set());
    } else {
      const newSet = new Set<string>();
      paginatedData.forEach((row) => newSet.add(rowKey(row)));
      setSelectedKeys(newSet);
    }
  };

  const toggleSelectRow = (key: string) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedKeys(newSet);
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = columns.map((c) => c.header).join(',');
    const rows = data.map((row) => columns.map((c) => {
      let val = String(row[c.key] ?? '');
      if (/^[=+\-@\t\r]/.test(val)) val = "'" + val;
      return `"${val.replace(/"/g, '""')}"`;
    }).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `coliseu_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rowPadding = density === 'compact' ? '6px 12px' : density === 'comfortable' ? '14px 16px' : '10px 14px';

  return (
    <div className="coliseu-table-container">
      {/* Top Controls */}
      <div style={{ padding: 'var(--spacing-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-strong)', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
        {title && <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{title}</h3>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar em todas as colunas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                paddingLeft: '32px',
                paddingRight: '12px',
                paddingTop: '6px',
                paddingBottom: '6px',
                backgroundColor: 'var(--surface-sunken)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-on-primary)',
                fontSize: 'var(--font-size-md)',
              }}
            />
          </div>

          <button
            onClick={() => setDensity(density === 'normal' ? 'compact' : density === 'compact' ? 'comfortable' : 'normal')}
            title="Alterar Densidade Visual"
            aria-label="Alterar densidade visual"
            style={{ backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)' }}
          >
            <SlidersHorizontal size={14} /> Densidade
          </button>

          <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={exportCSV}>
            Exportar CSV
          </Button>

          {selectedKeys.size > 0 && batchActions}
        </div>
      </div>

      {/* Table Body */}
      {isLoading ? (
        <div style={{ padding: '16px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="36px" style={{ marginBottom: '8px' }} />
          ))}
        </div>
      ) : paginatedData.length === 0 ? (
        <EmptyState title="Nenhum registro encontrado" description="Tente alterar os termos de busca ou remover os filtros." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="coliseu-table">
            <thead>
              <tr>
                <th style={{ padding: rowPadding, width: '40px' }}>
                  <input type="checkbox" checked={selectedKeys.size === paginatedData.length && paginatedData.length > 0} onChange={toggleSelectAll} />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    style={{
                      padding: rowPadding,
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {col.header}
                      {col.sortable && <ArrowUpDown size={12} color={sortKey === col.key ? 'var(--text-link)' : 'var(--text-muted)'} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row) => {
                const key = rowKey(row);
                const isSelected = selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{
                      backgroundColor: isSelected ? 'var(--action-primary)' : 'transparent',
                      cursor: onRowClick ? 'pointer' : 'default',
                    }}
                  >
                    <td style={{ padding: rowPadding }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(key)} />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} style={{ padding: rowPadding }}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-strong)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
        <div>
          Exibindo <strong>{Math.min(sortedData.length, (currentPage - 1) * pageSize + 1)}</strong> até{' '}
          <strong>{Math.min(sortedData.length, currentPage * pageSize)}</strong> de <strong>{sortedData.length}</strong> registros
          {selectedKeys.size > 0 && <span style={{ marginLeft: '12px', color: 'var(--text-link)' }}>({selectedKeys.size} selecionados)</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-strong)', color: 'var(--text-on-primary)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontSize: 'var(--font-size-sm)' }}
          >
            <option value={10}>10 por pg</option>
            <option value={25}>25 por pg</option>
            <option value={50}>50 por pg</option>
          </select>

          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label="Página anterior"
            style={{ backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-strong)', color: currentPage === 1 ? 'var(--text-disabled)' : 'var(--text-on-primary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Próxima página"
            style={{ backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-strong)', color: currentPage === totalPages ? 'var(--text-disabled)' : 'var(--text-on-primary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
