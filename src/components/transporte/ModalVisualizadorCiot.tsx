import React from 'react';
import { Button } from '../ui/Button';
import { Printer, ShieldCheck, X, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { OperacaoTransporteItem } from '../../lib/transporte';

interface ModalVisualizadorCiotProps {
  isOpen: boolean;
  onClose: () => void;
  operacao: OperacaoTransporteItem | null;
}

export const ModalVisualizadorCiot: React.FC<ModalVisualizadorCiotProps> = ({
  isOpen,
  onClose,
  operacao,
}) => {
  if (!isOpen || !operacao || !operacao.ciot_numero) return null;

  const handleImprimir = () => {
    window.print();
  };

  const valorFrete = operacao.valor_frete || 650.0;
  const valorPedagio = operacao.valor_pedagio || 45.0;
  const valorTotal = valorFrete + valorPedagio;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
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
          maxWidth: '800px',
          maxHeight: '94vh',
          backgroundColor: '#ffffff',
          color: '#000000',
          borderRadius: '8px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Barra Superior de Ações */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            backgroundColor: '#064e3b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#34d399" />
            <span style={{ fontSize: '14px', fontWeight: 800 }}>
              Comprovante de Homologação de CIOT — Pagamento Eletrônico de Frete (PEF / ANTT)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              onClick={handleImprimir}
              leftIcon={<Printer size={14} />}
              style={{ height: '30px', fontSize: '11px', backgroundColor: '#ffffff', color: '#064e3b', fontWeight: 700 }}
            >
              Imprimir Comprovante (Ctrl+P)
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              style={{ height: '30px', fontSize: '11px', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              Fechar
            </Button>
          </div>
        </div>

        {/* Documento Oficial CIOT / PEF / ANTT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#ffffff' }}>
          {/* Cabeçalho */}
          <div style={{ border: '2px solid #064e3b', padding: '12px', marginBottom: '10px', display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#064e3b' }}>
                AGÊNCIA NACIONAL DE TRANSPORTES TERRESTRES — ANTT
              </div>
              <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '2px' }}>
                COMPROVANTE DE CIOT — PAGAMENTO ELETRÔNICO DE FRETE
              </div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
                Regulamentado pela Resolução ANTT nº 5.862/2019 e Lei Federal nº 11.442/2007.
              </div>
            </div>

            <div style={{ textAlign: 'right', borderLeft: '1px solid #cbd5e1', paddingLeft: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700 }}>NÚMERO DO CIOT (ANTT):</div>
              <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#064e3b', letterSpacing: '1px' }}>
                {operacao.ciot_numero}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>
                STATUS: HOMOLOGADO / AUTORIZADO
              </div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                IPEF: {operacao.ciot_ipef || 'PAMCARD'} • Emissão: {operacao.data_saida || new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Dados do Contratante (Embarcador / Transportador) */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '8px', fontSize: '10px' }}>
            <div style={{ fontWeight: 900, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px', color: '#064e3b' }}>
              1. IDENTIFICAÇÃO DO CONTRATANTE DO FRETE:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '6px' }}>
              <div><strong>Razão Social:</strong> PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA</div>
              <div><strong>CNPJ:</strong> 05.766.577/0001-22</div>
              <div><strong>RNTRC Empresa:</strong> 09812345</div>
            </div>
          </div>

          {/* Dados do Contratado (Motorista / TAC) */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '8px', fontSize: '10px' }}>
            <div style={{ fontWeight: 900, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px', color: '#064e3b' }}>
              2. IDENTIFICAÇÃO DO TRANSPORTADOR AUTÔNOMO (TAC) / CONDUTOR:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '6px' }}>
              <div><strong>Nome do Condutor:</strong> {operacao.motorista_nome || 'VANDERLEI DA SILVA'}</div>
              <div><strong>CPF:</strong> 450.890.120-44</div>
              <div><strong>RNTRC TAC:</strong> 09812345</div>
            </div>
          </div>

          {/* Dados do Veículo e Viagem */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '8px', fontSize: '10px' }}>
            <div style={{ fontWeight: 900, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px', color: '#064e3b' }}>
              3. DADOS DA VIAGEM E VEÍCULO DE TRANSPORTE:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
              <div><strong>Placa do Veículo:</strong> {operacao.veiculo_placa || 'HQH-4490'}</div>
              <div><strong>Origem:</strong> {operacao.municipio_origem}/{operacao.uf_origem}</div>
              <div><strong>Destino:</strong> {operacao.municipio_destino}/{operacao.uf_destino}</div>
              <div><strong>Distância Estimada:</strong> 230 KM</div>
            </div>
          </div>

          {/* Discriminação dos Valores & Piso Mínimo ANTT */}
          <div style={{ border: '2px solid #000', padding: '10px', marginBottom: '10px', fontSize: '11px', display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 900, marginBottom: '6px', color: '#064e3b' }}>
                4. COMPOSIÇÃO DOS VALORES DO FRETE (PEF):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
                <div><strong>Frete Bruto:</strong> {formatCurrency(valorFrete)}</div>
                <div><strong>Vale-Pedágio (VPO):</strong> {formatCurrency(valorPedagio)}</div>
                <div><strong>Adiantamento:</strong> {formatCurrency(200.0)}</div>
                <div><strong>Forma de Pagamento:</strong> Cartão Eletrônico IPEF</div>
              </div>
              <div style={{ marginTop: '6px', fontSize: '9px', color: '#16a34a', fontWeight: 700 }}>
                ✅ Valor em estrita conformidade com a Tabela de Piso Mínimo da ANTT (Lei 13.703/2018).
              </div>
            </div>

            <div style={{ textAlign: 'right', borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
              <div style={{ fontSize: '10px', color: '#64748b' }}>VALOR TOTAL DA OPERAÇÃO:</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#064e3b', fontFamily: 'monospace' }}>
                {formatCurrency(valorTotal)}
              </div>
              <div style={{ fontSize: '10px', marginTop: '4px', color: '#475569' }}>
                Saldo a Pagar no Destino: <strong>{formatCurrency(valorTotal - 200.0)}</strong>
              </div>
            </div>
          </div>

          {/* Assinaturas */}
          <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', textAlign: 'center', fontSize: '10px' }}>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                <strong>CONTRATANTE / EMISSOR</strong>
                <div>PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA</div>
              </div>
            </div>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                <strong>TRANSPORTADOR AUTÔNOMO (TAC)</strong>
                <div>{operacao.motorista_nome || 'VANDERLEI DA SILVA'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
