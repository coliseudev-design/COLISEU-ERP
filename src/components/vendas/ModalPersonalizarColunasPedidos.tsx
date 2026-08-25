import React from 'react';
import { Button } from '../ui/Button';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  Columns,
} from 'lucide-react';

export interface ColunaTabelaPedido {
  id: string;
  label: string;
  visible: boolean;
  width: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
}

interface ModalPersonalizarColunasPedidosProps {
  isOpen: boolean;
  onClose: () => void;
  colunas: ColunaTabelaPedido[];
  onSalvarColunas: (novasColunas: ColunaTabelaPedido[]) => void;
  onRestaurarPadrao: () => void;
}

export const ModalPersonalizarColunasPedidos: React.FC<ModalPersonalizarColunasPedidosProps> = ({
  isOpen,
  onClose,
  colunas,
  onSalvarColunas,
  onRestaurarPadrao,
}) => {
  const [lista, setLista] = React.useState<ColunaTabelaPedido[]>(colunas);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    setLista(colunas);
  }, [colunas, isOpen]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const atualizado = lista.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c));
    setLista(atualizado);
  };

  const handleMarcarTodos = (visible: boolean) => {
    const atualizado = lista.map((c) => ({ ...c, visible }));
    setLista(atualizado);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const novaLista = [...lista];
    const [removido] = novaLista.splice(draggedIndex, 1);
    novaLista.splice(targetIndex, 0, removido);
    setLista(novaLista);
    setDraggedIndex(null);
  };

  const handleConfirmar = () => {
    onSalvarColunas(lista);
    onClose();
  };

  const visiveisCount = lista.filter((c) => c.visible).length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Columns size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Personalizar Colunas da Tabela
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                {visiveisCount} de {lista.length} colunas exibidas • Arraste para reordenar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Ações Rápidas */}
        <div
          style={{
            padding: '8px 18px',
            backgroundColor: 'var(--surface-3)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleMarcarTodos(true)}
              className="coliseu-btn coliseu-btn-secondary"
              style={{ height: '24px', fontSize: '10.5px', padding: '0 8px' }}
            >
              Exibir Todas
            </button>
            <button
              type="button"
              onClick={() => handleMarcarTodos(false)}
              className="coliseu-btn coliseu-btn-secondary"
              style={{ height: '24px', fontSize: '10.5px', padding: '0 8px' }}
            >
              Ocultar Todas
            </button>
          </div>

          <button
            type="button"
            onClick={onRestaurarPadrao}
            className="coliseu-btn coliseu-btn-secondary"
            style={{ height: '24px', fontSize: '10.5px', padding: '0 8px', color: '#eab308' }}
            title="Restaurar lista e ordem padrão de fábrica"
          >
            <RotateCcw size={11} style={{ marginRight: '4px' }} /> Restaurar Padrão
          </button>
        </div>

        {/* Lista de Colunas Reordenáveis */}
        <div
          style={{
            padding: '12px 18px',
            overflowY: 'auto',
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {lista.map((col, idx) => (
            <div
              key={col.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: col.visible ? 'var(--surface-2)' : 'var(--surface-3)',
                border: '1px solid ' + (col.visible ? 'var(--border-default)' : 'var(--border-subtle)'),
                opacity: col.visible ? 1 : 0.6,
                cursor: 'grab',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GripVertical size={15} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    width: '20px',
                  }}
                >
                  {idx + 1}º
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: col.visible ? 700 : 500,
                    color: col.visible ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {col.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleToggle(col.id)}
                  style={{
                    border: 'none',
                    background: col.visible ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: col.visible ? '#10b981' : '#ef4444',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {col.visible ? (
                    <>
                      <Eye size={12} /> Visível
                    </>
                  ) : (
                    <>
                      <EyeOff size={12} /> Oculta
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirmar} leftIcon={<Check size={14} />}>
            Aplicar Colunas
          </Button>
        </div>
      </div>
    </div>
  );
};
