import { Building2, ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useBranch } from '../contexts/BranchContext'

/**
 * Dropdown de seleção de Filial/Departamento.
 * Mostra "Todas as Filiais" como opção padrão.
 * Só renderiza se houver mais de 1 filial cadastrada.
 */
export default function BranchSelector() {
  const { filiais, selectedBranch, setSelectedBranch, isLoading } = useBranch()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Removemos a ocultação se tiver 1 filial para que o usuário saiba que a tela está ali
  if (isLoading) return null

  const selectedLabel =
    selectedBranch === 'todas'
      ? 'Todas as Filiais'
      : filiais.find((f) => f.depto_id === selectedBranch)?.nome || 'Filial'

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-divider bg-bg-secondary hover:bg-bg-tertiary text-sm font-medium transition-colors"
        title="Filtrar por Filial"
        aria-label="Filtrar por Filial"
      >
        <Building2 size={14} className="text-brand-500 shrink-0" />
        <span className="max-w-[120px] truncate text-text-primary">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-bg-secondary border border-divider rounded-xl shadow-card-hover z-40 py-1 overflow-hidden">
            {/* Opção "Todas" */}
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-bg-secondary transition-colors"
              onClick={() => { setSelectedBranch('todas'); setOpen(false) }}
            >
              <span className="font-medium text-text-primary">Todas as Filiais</span>
              {selectedBranch === 'todas' && <Check size={14} className="text-brand-500" />}
            </button>

            <div className="h-px bg-divider my-1" />

            {/* Filiais individuais */}
            {filiais.map((filial) => (
              <button
                key={filial.depto_id}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-bg-secondary transition-colors"
                onClick={() => { setSelectedBranch(filial.depto_id); setOpen(false) }}
              >
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-medium text-text-primary truncate max-w-[170px]">
                    {filial.nome}
                  </span>
                  {filial.documento && (
                    <span className="text-[10px] text-text-muted font-mono">{filial.documento}</span>
                  )}
                </div>
                {selectedBranch === filial.depto_id && (
                  <Check size={14} className="text-brand-500 shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
