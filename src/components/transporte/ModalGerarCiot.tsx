import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ShieldCheck, Send, X, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { CiotResult, MotoristaItem, VeiculoItem, transporteService } from '../../lib/transporte';
import { getCiotConfig } from '../../lib/ciotConfig';
import { PisoMinimoCalculator } from './PisoMinimoCalculator';

interface ModalGerarCiotProps {
  isOpen: boolean;
  onClose: () => void;
  onCiotGerado: (res: CiotResult) => void;
  operacaoId?: string;
  veiculos: VeiculoItem[];
  motoristas: MotoristaItem[];
  valorFreteSugerido?: number;
}

export const ModalGerarCiot: React.FC<ModalGerarCiotProps> = ({
  isOpen,
  onClose,
  onCiotGerado,
  operacaoId = 'op-default',
  veiculos,
  motoristas,
  valorFreteSugerido = 650.0,
}) => {
  const config = getCiotConfig();
  const [ipef, setIpef] = useState<string>(config.ipefPadrao);
  const [veiculoId, setVeiculoId] = useState(veiculos[0]?.id || '');
  const [motoristaId, setMotoristaId] = useState(motoristas[0]?.id || '');
  const [valorFrete, setValorFrete] = useState<number>(valorFreteSugerido);
  const [valorPedagio, setValorPedagio] = useState<number>(45.0);
  const [valorAdiantamento, setValorAdiantamento] = useState<number>(200.0);
  const [distanciaKm, setDistanciaKm] = useState<number>(230);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const motoristaSel = motoristas.find((m) => m.id === motoristaId);
  const veiculoSel = veiculos.find((v) => v.id === veiculoId);

  const handleGerar = async () => {
    setIsGenerating(true);
    try {
      const res = await transporteService.gerarCiot({
        operacao_id: operacaoId,
        filial_id: 'fil_matriz_01',
        ipef,
        cpf_cnpj_contratante: '68.148.349/0001-09',
        cpf_motorista: motoristaSel?.cpf || '450.890.120-44',
        rntrc_motorista: motoristaSel?.rntrc || '09812345',
        placa_veiculo: veiculoSel?.placa || 'HQH-4490',
        valor_frete: valorFrete,
        valor_pedagio: valorPedagio,
        valor_adiantamento: valorAdiantamento,
        distancia_km: distanciaKm,
        numero_eixos: 3,
        tipo_carga: 'GERAL',
      });
      onCiotGerado(res);
      onClose();
    } catch (err: any) {
      alert(`Erro ao gerar CIOT: ${err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#10b981" />
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Gerar CIOT (Código Identificador da Operação de Transporte)
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Homologação ANTT / IPEF para Pagamento Eletrônico de Frete Obrigatório
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Escolha da IPEF */}
          <div>
            <label className="coliseu-label">Instituição de Pagamento Eletrônico (IPEF Homologada ANTT):</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'PAMCARD', label: 'Pamcard (Roadcard)' },
                { id: 'REPOM', label: 'Repom (Edenred)' },
                { id: 'ANTT_DIRETO', label: 'ANTT Direto (Gratuito)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setIpef(opt.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: ipef === opt.id ? '2px solid #10b981' : '1px solid var(--border-default)',
                    backgroundColor: ipef === opt.id ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-2)',
                    color: ipef === opt.id ? '#10b981' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Motorista Contratado (TAC):</label>
              <select className="coliseu-input" value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome} ({m.cpf})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="coliseu-label">Veículo de Tração:</label>
              <select className="coliseu-input" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.placa} ({v.tipo_veiculo})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Valores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Valor Total Frete (R$) *</label>
              <input type="number" className="coliseu-input" value={valorFrete} onChange={(e) => setValorFrete(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right', fontWeight: 800, color: '#10b981' }} />
            </div>
            <div>
              <label className="coliseu-label">Vale-Pedágio (VPO)</label>
              <input type="number" className="coliseu-input" value={valorPedagio} onChange={(e) => setValorPedagio(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right' }} />
            </div>
            <div>
              <label className="coliseu-label">Adiantamento (R$)</label>
              <input type="number" className="coliseu-input" value={valorAdiantamento} onChange={(e) => setValorAdiantamento(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right' }} />
            </div>
          </div>

          {/* Calculadora Piso Mínimo */}
          <PisoMinimoCalculator
            distanciaKmInicial={distanciaKm}
            numeroEixosInicial={3}
            valorFreteInformado={valorFrete}
            onAplicarPiso={(p) => setValorFrete(p)}
          />
        </div>

        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleGerar}
            disabled={isGenerating}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            leftIcon={<ShieldCheck size={14} />}
          >
            {isGenerating ? 'Transmitindo à IPEF/ANTT...' : 'Homologar & Gerar CIOT'}
          </Button>
        </div>
      </div>
    </div>
  );
};
