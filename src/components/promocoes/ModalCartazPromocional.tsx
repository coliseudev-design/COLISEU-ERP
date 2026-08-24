import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Printer, X, Tag, Sparkles, Flame } from 'lucide-react';
import { CampanhaPromocional } from '../../lib/promocoesAvancadas';

interface ModalCartazPromocionalProps {
  isOpen: boolean;
  onClose: () => void;
  campanha: CampanhaPromocional | null;
}

export const ModalCartazPromocional: React.FC<ModalCartazPromocionalProps> = ({
  isOpen,
  onClose,
  campanha,
}) => {
  if (!isOpen || !campanha) return null;

  const item = campanha.itensPromocionais[0] || {
    descricao: campanha.titulo,
    precoDeTabela: 200.00,
    precoPromocional: 149.90,
    percentualDesconto: 25.0,
    codigoBarras: '7891991000803',
  };

  const economia = item.precoDeTabela - item.precoPromocional;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
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
          maxWidth: '700px',
          maxHeight: '94vh',
          backgroundColor: '#ffffff',
          color: '#111827',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Barra Superior */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            Gerador de Cartaz & Encarte de Ofertas para Loja Física (A4)
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer size={15} />}
            >
              Imprimir Cartaz (Ctrl + P)
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Folha do Cartaz Promocional */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              border: '6px solid #dc2626',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#fffbeb',
            }}
          >
            {/* Faixa Superior de Destaque */}
            <div
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <Flame size={24} fill="#facc15" color="#facc15" />
              OFERTA IMBATÍVEL
              <Flame size={24} fill="#facc15" color="#facc15" />
            </div>

            {/* Nome do Produto */}
            <h1
              style={{
                margin: '10px 0',
                fontSize: '24px',
                fontWeight: 900,
                color: '#111827',
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {item.descricao}
            </h1>

            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              Código: {item.codigoBarras} • Campanha: {campanha.titulo}
            </div>

            {/* Bloco DE / POR */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '3px dashed #dc2626',
                borderRadius: '10px',
                padding: '20px',
                margin: '10px 0',
              }}
            >
              <div style={{ fontSize: '18px', color: '#6b7280', textDecoration: 'line-through', fontWeight: 'bold' }}>
                DE: {formatCurrency(item.precoDeTabela)}
              </div>

              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626', marginTop: '6px' }}>
                POR APENAS:
              </div>

              <div
                style={{
                  fontSize: '52px',
                  fontWeight: 900,
                  color: '#dc2626',
                  lineHeight: 1,
                  margin: '8px 0',
                }}
              >
                {formatCurrency(item.precoPromocional)}
              </div>

              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  marginTop: '8px',
                }}
              >
                ECONOMIZE {formatCurrency(economia)} ({item.percentualDesconto}% OFF)
              </div>
            </div>

            {/* Rodapé de Validade */}
            <div style={{ marginTop: '16px', fontSize: '11px', color: '#4b5563', fontWeight: 'bold' }}>
              Oferta válida de {campanha.condicoes.dataInicio} até {campanha.condicoes.dataFim} ou enquanto durarem os estoques.
            </div>
            <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>
              COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA • Emitido via Coliseu ERP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
