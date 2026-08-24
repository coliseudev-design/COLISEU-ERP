import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Truck, Save, X, MapPin, ShieldCheck, FileText } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import {
  CteItem,
  MotoristaItem,
  OperacaoTransporteItem,
  RotaTransporteItem,
  VeiculoItem,
  transporteService,
} from '../../lib/transporte';

interface ModalCriarViagemProps {
  isOpen: boolean;
  onClose: () => void;
  onViagemCriada: (viagem: OperacaoTransporteItem) => void;
  veiculos: VeiculoItem[];
  motoristas: MotoristaItem[];
  rotas: RotaTransporteItem[];
  ctesDisponiveis: CteItem[];
}

export const ModalCriarViagem: React.FC<ModalCriarViagemProps> = ({
  isOpen,
  onClose,
  onViagemCriada,
  veiculos,
  motoristas,
  rotas,
  ctesDisponiveis,
}) => {
  const [veiculoId, setVeiculoId] = useState(veiculos[0]?.id || '');
  const [motoristaId, setMotoristaId] = useState(motoristas[0]?.id || '');
  const [rotaId, setRotaId] = useState(rotas[0]?.id || '');
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().slice(0, 16));
  const [dataPrevisaoChegada, setDataPrevisaoChegada] = useState('');
  const [ctesSelecionados, setCtesSelecionados] = useState<string[]>(() =>
    ctesDisponiveis.map((c) => c.id)
  );
  const [gerarCiotAutomatico, setGerarCiotAutomatico] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const rotaSel = rotas.find((r) => r.id === rotaId);
  const ctesEscolhidos = ctesDisponiveis.filter((c) => ctesSelecionados.includes(c.id));
  const pesoTotal = ctesEscolhidos.reduce((acc, c) => acc + c.peso_bruto_carga_kg, 0);
  const valorTotalCarga = ctesEscolhidos.reduce((acc, c) => acc + c.valor_carga, 0);
  const valorFreteTotal = ctesEscolhidos.reduce((acc, c) => acc + c.valor_total_prestacao, 0);

  const toggleCte = (id: string) => {
    if (ctesSelecionados.includes(id)) {
      setCtesSelecionados(ctesSelecionados.filter((x) => x !== id));
    } else {
      setCtesSelecionados([...ctesSelecionados, id]);
    }
  };

  const handleCriarViagem = async () => {
    setIsSaving(true);
    try {
      const veiculoSel = veiculos.find((v) => v.id === veiculoId);
      const motoristaSel = motoristas.find((m) => m.id === motoristaId);

      const timestamp = Date.now().toString().slice(-6);
      const ciotNum = gerarCiotAutomatico ? `202608${timestamp}` : undefined;

      const novaViagem = await transporteService.salvarOperacaoTransporte({
        filial_id: 'fil_matriz_01',
        data_saida: dataSaida,
        data_chegada_prevista: dataPrevisaoChegada || undefined,
        veiculo_id: veiculoId,
        veiculo_placa: veiculoSel?.placa,
        motorista_id: motoristaId,
        motorista_nome: motoristaSel?.nome,
        rota_id: rotaId,
        rota_nome: rotaSel?.nome,
        uf_origem: rotaSel?.uf_origem || 'MS',
        municipio_origem: rotaSel?.municipio_origem || 'DOURADOS',
        uf_destino: rotaSel?.uf_destino || 'MS',
        municipio_destino: rotaSel?.municipio_destino || 'CAMPO GRANDE',
        peso_total_kg: pesoTotal > 0 ? pesoTotal : 2450.0,
        valor_total_carga: valorTotalCarga > 0 ? valorTotalCarga : 18500.0,
        valor_frete: valorFreteTotal > 0 ? valorFreteTotal : 650.0,
        valor_pedagio: rotaSel?.valor_pedagio_estimado || 45.0,
        ciot_numero: ciotNum,
        ciot_ipef: 'PAMCARD',
        cte_ids: ctesSelecionados,
      });

      onViagemCriada(novaViagem);
      onClose();
    } catch (err: any) {
      alert(`Erro ao criar operação de viagem: ${err}`);
    } finally {
      setIsSaving(false);
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
          maxWidth: '780px',
          maxHeight: '90vh',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
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
            <Truck size={18} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Nova Operação de Transporte (Planejamento de Viagem)
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.5fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Veículo Tração *</label>
              <select className="coliseu-input" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.placa} ({v.tipo_veiculo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="coliseu-label">Motorista *</label>
              <select className="coliseu-input" value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="coliseu-label">Rota de Transporte *</label>
              <select className="coliseu-input" value={rotaId} onChange={(e) => setRotaId(e.target.value)} style={{ height: '34px' }}>
                {rotas.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Data & Hora de Saída *</label>
              <input type="datetime-local" className="coliseu-input" value={dataSaida} onChange={(e) => setDataSaida(e.target.value)} style={{ height: '34px' }} />
            </div>
            <div>
              <label className="coliseu-label">Previsão de Chegada</label>
              <input type="datetime-local" className="coliseu-input" value={dataPrevisaoChegada} onChange={(e) => setDataPrevisaoChegada(e.target.value)} style={{ height: '34px' }} />
            </div>
          </div>

          {/* Seleção de CT-es Vinculados */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Vincular CT-es autorizados para esta viagem ({ctesSelecionados.length} selecionados):
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                Frete: {formatCurrency(valorFreteTotal)} | Carga: {formatCurrency(valorTotalCarga)}
              </span>
            </div>

            <div className="coliseu-table-container">
              <table className="coliseu-table" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '36px', textAlign: 'center' }}>Sel.</th>
                    <th style={{ width: '90px' }}>Nº CT-e</th>
                    <th>Destinatário</th>
                    <th style={{ width: '90px' }}>Destino</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Valor Frete</th>
                  </tr>
                </thead>
                <tbody>
                  {ctesDisponiveis.map((c) => (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={ctesSelecionados.includes(c.id)} onChange={() => toggleCte(c.id)} />
                      </td>
                      <td style={{ fontWeight: 700, color: '#3b82f6' }}>CT-e {c.numero_cte}</td>
                      <td>{c.destinatario_nome}</td>
                      <td>{c.municipio_fim}/{c.uf_fim}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(c.valor_total_prestacao)}</td>
                    </tr>
                  ))}
                  {ctesDisponiveis.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        Nenhum CT-e pendente de vinculação. A viagem será criada com carga avulsa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <input type="checkbox" checked={gerarCiotAutomatico} onChange={(e) => setGerarCiotAutomatico(e.target.checked)} />
            Gerar e vincular CIOT automaticamente via Pamcard / ANTT para esta viagem
          </label>
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
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCriarViagem} disabled={isSaving} leftIcon={<Truck size={14} />}>
            {isSaving ? 'Criando Viagem...' : 'Iniciar Operação de Transporte'}
          </Button>
        </div>
      </div>
    </div>
  );
};
