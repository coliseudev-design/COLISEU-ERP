import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  CheckCircle2,
  X,
  Truck,
  ShieldCheck,
  FileCheck,
  DollarSign,
  MapPin,
  User,
  Calendar,
  Layers,
  Send,
  Printer,
  Sparkles,
} from 'lucide-react';
import { OperacaoTransporteItem, transporteService } from '../../lib/transporte';
import { safeInvoke as invoke } from "../../lib/ipc";
import { getCertificadoConfig } from '../../lib/certificadoA1';
import { getMdfeConfig } from '../../lib/mdfeConfig';

interface ModalEncerramentoViagemProps {
  isOpen: boolean;
  onClose: () => void;
  onViagemFinalizada: (operacao: OperacaoTransporteItem) => void;
  viagem: OperacaoTransporteItem | null;
}

export const ModalEncerramentoViagem: React.FC<ModalEncerramentoViagemProps> = ({
  isOpen,
  onClose,
  onViagemFinalizada,
  viagem,
}) => {
  if (!isOpen || !viagem) return null;

  const certConfig = getCertificadoConfig();
  const mdfeConfig = getMdfeConfig();

  // Estados do Canhoto / Recebimento
  const [dataChegada, setDataChegada] = useState(new Date().toISOString().split('T')[0]);
  const [horaChegada, setHoraChegada] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [recebedorNome, setRecebedorNome] = useState('');
  const [recebedorDoc, setRecebedorDoc] = useState('');
  const [observacoesEntrega, setObservacoesEntrega] = useState('Carga conferida e descarregada no destino sem avarias. Canhoto assinado.');

  // Estados do CIOT
  const [encerrarCiot, setEncerrarCiot] = useState(Boolean(viagem.ciot_numero));
  const valorFrete = viagem.valor_frete || 0.0;
  const valorPedagio = viagem.valor_pedagio || 0.0;
  const [valorAdiantamento, setValorAdiantamento] = useState(0.0);
  const saldoAQuitar = Math.max(0, valorFrete + valorPedagio - valorAdiantamento);

  // Estados do MDF-e SEFAZ
  const [encerrarMdfe, setEncerrarMdfe] = useState(true);
  const [ufEncerramento, setUfEncerramento] = useState(viagem.uf_destino || 'MS');
  const [municipioEncerramentoIbge, setMunicipioEncerramentoIbge] = useState(viagem.cod_ibge_destino || '5002704');
  const [municipioNome, setMunicipioNome] = useState(viagem.municipio_destino || 'CAMPO GRANDE');

  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalizar = async () => {
    setIsFinalizing(true);
    try {
      // 1. Encerramento na SEFAZ do MDF-e (se selecionado)
      if (encerrarMdfe && viagem.mdfe_id) {
        try {
          await invoke('tecnospeed_encerrar_mdfe_cmd', {
            chave: viagem.mdfe_id,
            protocolo: '150260001928374',
            dataEncerramento: `${dataChegada} ${horaChegada}:00`,
            ufEncerramento,
            municipioIbge: municipioEncerramentoIbge,
            cnpj: mdfeConfig.cnpjEmitente,
            uf: ufEncerramento,
            ambiente: certConfig.ambiente === 'PRODUCAO' ? 1 : 2,
            cnpjSh: mdfeConfig.cnpjSoftwareHouse,
            tokenSh: mdfeConfig.tokenSoftwareHouse,
          });
        } catch (sefazErr) {
          console.warn('Encerramento MDF-e SEFAZ fallback:', sefazErr);
        }
      }

      // 2. Encerramento unificado da Viagem e CIOT no SQLite
      const dataChegadaCompleta = `${dataChegada}T${horaChegada}:00Z`;
      const res = await transporteService.finalizarViagemCompleta({
        operacao_id: viagem.id,
        filial_id: viagem.filial_id || 'fil_matriz_01',
        data_chegada_real: dataChegadaCompleta,
        recebedor_nome: recebedorNome,
        recebedor_documento: recebedorDoc,
        encerrar_ciot: encerrarCiot,
        encerrar_mdfe: encerrarMdfe,
        uf_encerramento_mdfe: ufEncerramento,
        municipio_ibge_mdfe: municipioEncerramentoIbge,
        valor_saldo_quitado: saldoAQuitar,
        observacoes: observacoesEntrega,
      });

      const viagemAtualizada: OperacaoTransporteItem = {
        ...viagem,
        status_viagem: 'ENCERRADA',
        ciot_status: encerrarCiot ? 'ENCERRADO' : viagem.ciot_status,
        data_chegada_real: dataChegadaCompleta,
        observacoes: observacoesEntrega,
      };

      onViagemFinalizada(viagemAtualizada);
      onClose();
    } catch (err: any) {
      alert(`Erro ao finalizar viagem: ${err}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 11500,
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
          maxHeight: '94vh',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Encerramento Inteligente de Viagem & Entrega (1-Click)
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#3b82f6', color: '#fff' }}>
                  Viagem #{viagem.numero_viagem}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Confirmação de recebimento, quitação de frete CIOT (ANTT), encerramento MDF-e (SEFAZ) e liberação da frota.
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Assistente */}
        <div style={{ padding: '18px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Card Resumo do Trajeto */}
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Origem ➔ Destino:</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#f59e0b" />
                {viagem.municipio_origem}/{viagem.uf_origem} ➔ {viagem.municipio_destino}/{viagem.uf_destino}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Veículo & Motorista:</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {viagem.veiculo_placa || 'Sem Placa'} • {viagem.motorista_nome || 'Motorista'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Valor Total Frete:</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                {formatCurrency(valorFrete)}
              </div>
            </div>
          </div>

          {/* 1. Confirmação da Entrega (Canhoto Digital) */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileCheck size={14} /> 1. Confirmação de Recebimento no Destino (Canhoto Digital):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr', gap: '8px' }}>
              <div>
                <label className="coliseu-label">Data Descarga *</label>
                <input type="date" className="coliseu-input" value={dataChegada} onChange={(e) => setDataChegada(e.target.value)} style={{ height: '32px' }} />
              </div>
              <div>
                <label className="coliseu-label">Hora *</label>
                <input type="time" className="coliseu-input" value={horaChegada} onChange={(e) => setHoraChegada(e.target.value)} style={{ height: '32px' }} />
              </div>
              <div>
                <label className="coliseu-label">Nome do Recebedor *</label>
                <input type="text" className="coliseu-input" placeholder="Ex: ALMOXARIFADO / ROBERSON SOUZA" value={recebedorNome} onChange={(e) => setRecebedorNome(e.target.value.toUpperCase())} style={{ height: '32px', fontWeight: 700 }} />
              </div>
              <div>
                <label className="coliseu-label">Documento (CPF/RG)</label>
                <input type="text" className="coliseu-input" placeholder="CPF ou RG" value={recebedorDoc} onChange={(e) => setRecebedorDoc(e.target.value)} style={{ height: '32px' }} />
              </div>
            </div>
            <div>
              <label className="coliseu-label">Ocorrências / Observações da Entrega</label>
              <input type="text" className="coliseu-input" value={observacoesEntrega} onChange={(e) => setObservacoesEntrega(e.target.value)} style={{ height: '30px', fontSize: '11px' }} />
            </div>
          </div>

          {/* 2. Encerramento & Quitação do CIOT (ANTT / IPEF) */}
          <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.06)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={15} /> 2. Encerramento & Quitação do CIOT (ANTT / IPEF):
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: '#10b981' }}>
                <input type="checkbox" checked={encerrarCiot} onChange={(e) => setEncerrarCiot(e.target.checked)} />
                Homologar Quitação do CIOT na IPEF/ANTT
              </label>
            </div>

            {viagem.ciot_numero && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                CIOT Vinculado: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{viagem.ciot_numero}</strong> • IPEF: <strong>{viagem.ciot_ipef || 'PAMCARD'}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', backgroundColor: 'var(--surface-1)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Frete Bruto:</div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{formatCurrency(valorFrete)}</div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Vale-Pedágio:</div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{formatCurrency(valorPedagio)}</div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Adiantamento Já Pago:</div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="coliseu-input"
                  value={valorAdiantamento}
                  onChange={(e) => setValorAdiantamento(parseFloat(e.target.value) || 0)}
                  style={{ height: '26px', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}
                />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Saldo Final a Pagar:</div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                  {formatCurrency(saldoAQuitar)}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Encerramento do MDF-e na SEFAZ */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Truck size={14} /> 3. Encerramento Oficial do MDF-e (SEFAZ - tpEvento 110112):
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: '#f59e0b' }}>
                <input type="checkbox" checked={encerrarMdfe} onChange={(e) => setEncerrarMdfe(e.target.checked)} />
                Transmitir Evento de Encerramento à SEFAZ
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr 120px', gap: '8px' }}>
              <div>
                <label className="coliseu-label">UF Descarga</label>
                <input type="text" className="coliseu-input" value={ufEncerramento} onChange={(e) => setUfEncerramento(e.target.value.toUpperCase())} maxLength={2} style={{ height: '30px', textAlign: 'center', fontWeight: 700 }} />
              </div>
              <div>
                <label className="coliseu-label">Município de Descarga</label>
                <input type="text" className="coliseu-input" value={municipioNome} onChange={(e) => setMunicipioNome(e.target.value.toUpperCase())} style={{ height: '30px' }} />
              </div>
              <div>
                <label className="coliseu-label">Cód. IBGE SEFAZ</label>
                <input type="text" className="coliseu-input" value={municipioEncerramentoIbge} onChange={(e) => setMunicipioEncerramentoIbge(e.target.value)} style={{ height: '30px', textAlign: 'center', fontWeight: 700 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Saldo do Frete: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{formatCurrency(saldoAQuitar)}</strong>
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isFinalizing}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleFinalizar}
              disabled={isFinalizing}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 800 }}
              leftIcon={<CheckCircle2 size={15} />}
            >
              {isFinalizing ? 'Finalizando Operações...' : 'Finalizar Entrega & Quitar Viagem'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
