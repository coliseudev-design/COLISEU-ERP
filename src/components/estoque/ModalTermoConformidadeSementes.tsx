import React from 'react';
import { Button } from '../ui/Button';
import { Printer, X, Sprout, ShieldCheck } from 'lucide-react';
import { LoteItem } from '../../lib/lotes';

interface ModalTermoConformidadeSementesProps {
  isOpen: boolean;
  onClose: () => void;
  lote: LoteItem | null;
}

export const ModalTermoConformidadeSementes: React.FC<ModalTermoConformidadeSementesProps> = ({
  isOpen,
  onClose,
  lote,
}) => {
  if (!isOpen || !lote || !lote.dadosSementes) return null;

  const sem = lote.dadosSementes;

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
          maxWidth: '850px',
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
            Termo de Conformidade / Atestado de Garantia — Lote: {lote.numeroLote}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer size={15} />}
            >
              Imprimir Atestado (Ctrl + P)
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

        {/* Documento A4 Formato Oficial MAPA */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '30px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          {/* Cabeçalho */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>MINISTÉRIO DA AGRICULTURA E PECUÁRIA - MAPA</div>
            <div style={{ fontSize: '10px' }}>SISTEMA NACIONAL DE SEMENTES E MUDAS - SNSM (LEI Nº 10.711/2003)</div>
            <h1 style={{ margin: '6px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
              TERMO DE CONFORMIDADE DE SEMENTES
            </h1>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#16a34a' }}>
              {sem.termoConformidadeNum || 'TC-2026/001'}
            </div>
          </div>

          {/* Identificação do Produtor / Cooperativa */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              1. IDENTIFICAÇÃO DO PRODUTOR / REEMBALADOR
            </div>
            <div><strong>Razão Social:</strong> COLISEU MATERIAIS & DISTRIBUICAO LTDA</div>
            <div><strong>CNPJ:</strong> 12.345.678/0001-90 • <strong>Inscrição Estadual:</strong> 28.991.002-3</div>
            <div><strong>RENASEM do Produtor:</strong> <strong style={{ color: '#16a34a' }}>{sem.renasemProdutor}</strong></div>
            <div><strong>Endereço:</strong> AV. MARCELINO PIRES, 1250 - DOURADOS/MS - BRASIL</div>
          </div>

          {/* Identificação do Lote e da Cultivar */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              2. IDENTIFICAÇÃO DO LOTE, ESPÉCIE E CULTIVAR
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '6px' }}>
              <div><strong>Espécie / Cultivar:</strong> {sem.especieCultivar}</div>
              <div><strong>Número do Lote:</strong> <strong style={{ color: '#2563eb' }}>{lote.numeroLote}</strong></div>
              <div><strong>Categoria da Semente:</strong> {sem.categoria}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
              <div><strong>Peneira / Calibre:</strong> <strong style={{ color: '#d97706' }}>{sem.peneira}</strong></div>
              <div><strong>Safra de Produção:</strong> {sem.safra}</div>
              <div><strong>Campo de Produção:</strong> {sem.campoProducao || 'GLEBA 01'}</div>
            </div>
          </div>

          {/* Atributos de Qualidade Laboratorial (BAS) */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              3. PARÂMETROS FISIOLÓGICOS E BOLETIM DE ANÁLISE DE SEMENTES (BAS)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center', marginTop: '6px' }}>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666' }}>GERMINAÇÃO MÍNIMA</div>
                <strong style={{ fontSize: '15px', color: '#16a34a' }}>{sem.germinacaoPercent}%</strong>
              </div>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666' }}>PUREZA FÍSICA</div>
                <strong style={{ fontSize: '15px' }}>{sem.purezaPercent}%</strong>
              </div>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666' }}>VIGOR (TETRAZÓLIO)</div>
                <strong style={{ fontSize: '15px' }}>{sem.vigorPercent || 85.0}%</strong>
              </div>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666' }}>PMS (MIL SEMENTES)</div>
                <strong style={{ fontSize: '15px' }}>{sem.pmsGramas || 165.0}g</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '6px', marginTop: '8px' }}>
              <div><strong>Nº Boletim Análise (BAS):</strong> {sem.numeroBAS}</div>
              <div><strong>Data Análise:</strong> {sem.dataAnaliseGerminacao}</div>
              <div><strong>Validade do Teste:</strong> <strong style={{ color: '#16a34a' }}>{sem.validadeTesteGerminacao}</strong></div>
            </div>

            {sem.tratamentoTSI && (
              <div style={{ marginTop: '6px', borderTop: '1px dashed #ccc', paddingTop: '4px' }}>
                <strong>Tratamento Industrial de Sementes (TSI):</strong> {sem.tratamentoTSI}
              </div>
            )}
          </div>

          {/* Termo Legal e Assinaturas */}
          <div style={{ fontSize: '10px', color: '#4b5563', textAlign: 'justify', marginBottom: '24px' }}>
            Atestamos para os devidos fins legais que o lote de sementes acima qualificado foi produzido, amostrado e analisado em conformidade com as normas e padrões estabelecidos pelo Ministério da Agricultura e Pecuária (MAPA) e pelas Regras para Análise de Sementes (RAS), encontrando-se apto para comercialização e semeadura.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', textAlign: 'center', marginTop: '30px' }}>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                <strong>COLISEU MATERIAIS & DISTRIBUICAO LTDA</strong>
                <div style={{ fontSize: '9px', color: '#666' }}>Produtor / Distribuidor de Sementes</div>
              </div>
            </div>

            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                <strong>{sem.responsavelTecnicoNome || 'ENG. AGRÔNOMO RESPONSÁVEL'}</strong>
                <div style={{ fontSize: '9px', color: '#666' }}>Responsável Técnico • {sem.responsavelTecnicoCrea || 'CREA-MS'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
