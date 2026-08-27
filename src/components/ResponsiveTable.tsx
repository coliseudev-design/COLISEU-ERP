import React from 'react'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T, index: number) => React.ReactNode
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  renderMobileCard: (row: T, index: number) => React.ReactNode
  keyExtractor: (row: T, index: number) => string | number
  emptyMessage?: string
  className?: string
}

/** Tabela desktop + fallback em cards mobile */
export default function ResponsiveTable<T>({
  columns, data, renderMobileCard, keyExtractor, emptyMessage = 'Sem dados', className = ''
}: Props<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">{emptyMessage}</div>
    )
  }

  return (
    <>
      {/* Desktop — tabela normal */}
      <div className={`hidden sm:block overflow-x-auto rounded-xl border border-divider/50 ${className}`}>
        <table className="w-full text-left text-xs whitespace-nowrap" aria-label="Tabela de dados">
          <thead>
            <tr className="border-b border-divider/50 bg-bg-secondary/40">
              {columns.map((col) => (
                <th key={String(col.key)} className={`px-4 py-3 font-semibold text-text-secondary uppercase tracking-wide ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider/30">
            {data.map((row, i) => (
              <tr key={keyExtractor(row, i)} className="hover:bg-bg-secondary/30 transition-colors">
                {columns.map((col) => (
                  <td key={String(col.key)} className={`px-4 py-3 text-text-primary ${col.className ?? ''}`}>
                    {col.render ? col.render(row, i) : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — fallback em cards */}
      <div className="sm:hidden space-y-2">
        {data.map((row, i) => (
          <div
            key={keyExtractor(row, i)}
            className="p-3 border border-divider/50 rounded-xl bg-bg-secondary/10"
          >
            {renderMobileCard(row, i)}
          </div>
        ))}
      </div>
    </>
  )
}
