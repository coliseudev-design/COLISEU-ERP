import React from 'react';
import { Button } from '../ui/Button';
import { Printer, X, FlaskConical, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { LoteItem } from '../../lib/lotes';

interface ModalFispqLaudoQuimicoProps {
  isOpen: boolean;
  onClose: () => void;
  lote: LoteItem | null;
}

export const ModalFispqLaudoQuimico: React.FC<ModalFispqLaudoQuimicoProps> = ({
  isOpen,
  onClose,
  lote,
}) => {
  if (!isOpen || !lote || !lote.dadosQuimicos) return null;

  const q = lote.dadosQuimicos;

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
            Ficha de Emergência (ANTT) & Laudo de Análise Química — Lote: {lote.numeroLote}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer size={15} />}
            >
              Imprimir Laudo / FISPQ (Ctrl + P)
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

        {/* Folha de Impressão A4 */}
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
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>COLISEU MATERIAIS, QUÍMICOS & DISTRIBUIÇÃO LTDA</div>
            <div style={{ fontSize: '10px', color: '#4b5563' }}>LABORATÓRIO DE CONTROLE DE QUALIDADE INDUSTRIAL & AGROQUÍMICA</div>
            <h1 style={{ margin: '6px 0 0 0', fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>
              CERTIFICADO DE ANÁLISE QUÍMICA (CoA) & FICHA DE EMERGÊNCIA ANTT
            </h1>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb' }}>
              {q.laudoCqNumero || 'LAUDO-CQ-2026/001'}
            </div>
          </div>

          {/* Painel de Risco ANTT (Placa Laranja & Rótulo de Risco) */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '14px', border: '2px solid #ea580c', borderRadius: '4px', padding: '10px', backgroundColor: '#fff7ed', marginBottom: '14px' }}>
            {/* Painel de Segurança ANTT (Laranja) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f97316', color: '#000', border: '2px solid #000', borderRadius: '4px', padding: '6px', fontWeight: 'bold', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', borderBottom: '2px solid #000', width: '100%', paddingBottom: '2px' }}>
                {q.numeroRisco || '33'}
              </div>
              <div style={{ fontSize: '20px', paddingTop: '2px' }}>
                {q.numeroOnu || '1263'}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#c2410c' }}>
                CLASSIFICAÇÃO ANTT (TRANSPORTE DE PRODUTOS PERIGOSOS)
              </div>
              <div><strong>Nome Apropriado para Embarque:</strong> {q.nomeApropriadoEmbarque}</div>
              <div><strong>Nº ONU:</strong> {q.numeroOnu} • <strong>Classe de Risco:</strong> {q.classeRisco} • <strong>Nº de Risco:</strong> {q.numeroRisco}</div>
              <div><strong>Grupo de Embalagem:</strong> {q.grupoEmbalagem}</div>
              {q.pontoFulgorCelsius !== undefined && (
                <div><strong>Ponto de Fulgor:</strong> {q.pontoFulgorCelsius}°C (Líquido Inflamável)</div>
              )}
            </div>
          </div>

          {/* Identificação do Produto e Lote */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              1. IDENTIFICAÇÃO DO PRODUTO & CONTROLE DE ÓRGÃOS REGULADORES
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
              <div><strong>Produto Comercial:</strong> {lote.produtoDescricao}</div>
              <div><strong>Número do Lote:</strong> <strong style={{ color: '#2563eb' }}>{lote.numeroLote}</strong></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
              <div><strong>Princípio Ativo / Composição:</strong> {q.principioAtivo || '-'}</div>
              <div><strong>Concentração:</strong> {q.concentracao || '-'}</div>
              <div><strong>Grupo Químico:</strong> {q.grupoQuimico || '-'}</div>
            </div>

            {/* Licenças e Controles */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', borderTop: '1px dashed #ccc', paddingTop: '4px', fontSize: '10px' }}>
              {q.controladoPoliciaFederal && (
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  🚨 CONTROLADO PELA POLÍCIA FEDERAL (Licença: {q.licencaPoliciaFederal || 'DPF/MS'})
                </span>
              )}
              {q.controladoExercito && (
                <span style={{ color: '#b45309', fontWeight: 'bold' }}>
                  🛡️ CONTROLADO PELO EXÉRCITO BRASILEIRO (CR: {q.certificadoRegistroExercito || 'CR-EB'})
                </span>
              )}
              {q.receituarioAgronomicoObrigatorio && (
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                  🌾 VENDA EXCLUSIVA SOB RECEITUÁRIO AGRONÔMICO (MAPA {q.registroMapaDefensivo || 'MAPA'})
                </span>
              )}
            </div>
          </div>

          {/* Parâmetros Físico-Químicos Laboratoriais (Laudo CQ) */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '14px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              2. RESULTADOS DOS ENSAIOS FÍSICO-QUÍMICOS (CONTROLE DE QUALIDADE)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center', marginTop: '6px' }}>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', color: '#666' }}>DENSIDADE (20°C)</div>
                <strong style={{ fontSize: '13px' }}>{q.densidadeGcm3 || '0.985'} g/cm³</strong>
              </div>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', color: '#666' }}>VISCOSIDADE</div>
                <strong style={{ fontSize: '13px' }}>{q.viscosidadeSeg ? `${q.viscosidadeSeg}s Ford` : 'N/A'}</strong>
              </div>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', color: '#666' }}>TEOR SÓLIDOS</div>
                <strong style={{ fontSize: '13px' }}>{q.teorSolidosPercent !== undefined ? `${q.teorSolidosPercent}%` : 'N/A'}</strong>
              </div>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', color: '#666' }}>POTENCIAL PH</div>
                <strong style={{ fontSize: '13px' }}>{q.ph || '7.0'}</strong>
              </div>
              <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', color: '#666' }}>STATUS LOTE</div>
                <strong style={{ fontSize: '13px', color: '#16a34a' }}>{lote.status}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '8px', fontSize: '10px' }}>
              <div><strong>Fabricação:</strong> {lote.dataFabricacao}</div>
              <div><strong>Validade Técnica:</strong> <strong style={{ color: '#16a34a' }}>{lote.dataValidade}</strong></div>
              <div><strong>Armazenamento:</strong> {lote.localizacaoWms}</div>
            </div>
          </div>

          {/* Medidas de Emergência e Primeiros Socorros */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '20px', fontSize: '10px', lineHeight: 1.35 }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              3. MEDIDAS DE SEGURANÇA, VAZAMENTO & PRIMEIROS SOCORROS (FISPQ / NBR 14725)
            </div>
            <div>• <strong>Em caso de fogo:</strong> Usar pó químico seco, espuma resistente a álcool ou CO2. Não usar jato de água direto.</div>
            <div>• <strong>Em caso de vazamento:</strong> Isolar a área, eliminar fontes de ignição, conter com areia seca ou terra e transferir para recipiente de descarte homologado.</div>
            <div>• <strong>Primeiros Socorros:</strong> Em contato com a pele/olhos lavar com água em abundância por 15 minutos. Se inalado, remover a vítima para local ventilado.</div>
          </div>

          {/* Assinaturas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', textAlign: 'center', marginTop: '20px' }}>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                <strong>COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA</strong>
                <div style={{ fontSize: '9px', color: '#666' }}>Garantia de Qualidade & Meio Ambiente</div>
              </div>
            </div>

            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                <strong>{q.responsavelTecnicoQuimico || 'RESPONSÁVEL TÉCNICO'}</strong>
                <div style={{ fontSize: '9px', color: '#666' }}>Controle de Qualidade • {q.crqNumero || 'CRQ / CREA'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
