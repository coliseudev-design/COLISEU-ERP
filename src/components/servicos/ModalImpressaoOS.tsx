import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Printer, X, Wrench, ShieldCheck } from 'lucide-react';
import { OrdemServicoItem } from '../../lib/ordensServico';

interface ModalImpressaoOSProps {
  isOpen: boolean;
  onClose: () => void;
  os: OrdemServicoItem | null;
}

export const ModalImpressaoOS: React.FC<ModalImpressaoOSProps> = ({ isOpen, onClose, os }) => {
  if (!isOpen || !os) return null;

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
        {/* Barra de Ações Superior (Não impressa) */}
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
            Visualização de Impressão — {os.numeroOS}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer size={15} />}
            >
              Imprimir O.S. (Ctrl + P)
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

        {/* Documento Formatado A4 / Folha de Impressão */}
        <div
          id="os-print-area"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '30px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            lineHeight: 1.4,
          }}
        >
          {/* Cabeçalho da Empresa */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                COLISEU MATERIAIS & SERVIÇOS LTDA
              </h1>
              <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                CNPJ: 12.345.678/0001-90 • I.E: 28.991.002-3 • TEL: (67) 3421-0000
              </div>
              <div style={{ fontSize: '11px', color: '#4b5563' }}>
                AV. MARCELINO PIRES, 1250 - CENTRO - DOURADOS/MS
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>
                {os.numeroOS}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', marginTop: '2px' }}>
                STATUS: {os.status.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>
                Emissão: {os.dataAbertura} às {os.horaAbertura}
              </div>
            </div>
          </div>

          {/* Dados do Cliente e Equipamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '6px' }}>
                DADOS DO CLIENTE
              </div>
              <div><strong>Nome:</strong> {os.clienteNome}</div>
              <div><strong>CPF/CNPJ:</strong> {os.clienteCpfCnpj || 'NÃO INFORMADO'}</div>
              <div><strong>Telefone:</strong> {os.clienteTelefone || 'NÃO INFORMADO'}</div>
            </div>

            <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '6px' }}>
                OBJETO / VEÍCULO / EQUIPAMENTO
              </div>
              <div><strong>Descrição:</strong> {os.descricaoObjeto}</div>
              <div><strong>Marca/Modelo:</strong> {os.marcaObjeto} {os.modeloObjeto}</div>
              <div><strong>Placa/Série:</strong> {os.placaOuSerie || '-'} • <strong>KM/Horas:</strong> {os.kmOuHorimetro || '-'}</div>
            </div>
          </div>

          {/* Defeito Relatado e Laudo */}
          <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '10px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '6px' }}>
              <strong>DEFEITO RELATADO:</strong> {os.defeitoRelatado}
            </div>
            {os.laudoTecnico && (
              <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '6px', marginTop: '6px' }}>
                <strong>LAUDO TÉCNICO / DIAGNÓSTICO:</strong> {os.laudoTecnico}
              </div>
            )}
            {os.solucaoExecutada && (
              <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '6px', marginTop: '6px' }}>
                <strong>SOLUÇÃO EXECUTADA:</strong> {os.solucaoExecutada}
              </div>
            )}
          </div>

          {/* Peças e Materiais */}
          {os.pecas.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                PEÇAS & MATERIAIS APLICADOS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>SKU</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Descrição</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px' }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px' }}>Vl. Unit</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {os.pecas.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '4px 6px' }}>{p.sku}</td>
                      <td style={{ padding: '4px 6px' }}>{p.descricao}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px' }}>{p.quantidade} {p.unidade}</td>
                      <td style={{ textAlign: 'right', padding: '4px 6px' }}>{formatCurrency(p.valorUnitario)}</td>
                      <td style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 'bold' }}>{formatCurrency(p.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Serviços e Mão de Obra */}
          {os.servicos.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                SERVIÇOS & MÃO DE OBRA
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Código</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Descrição do Serviço</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Técnico</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px' }}>Horas</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {os.servicos.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '4px 6px' }}>{s.codigo}</td>
                      <td style={{ padding: '4px 6px' }}>{s.descricao}</td>
                      <td style={{ padding: '4px 6px' }}>{s.tecnicoResponsavel}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px' }}>{s.tempoHoras} h</td>
                      <td style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 'bold' }}>{formatCurrency(s.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totais do Documento */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <div style={{ width: '280px', border: '1px solid #111827', borderRadius: '4px', padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal Peças:</span>
                <span>{formatCurrency(os.totalPecas)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal Serviços:</span>
                <span>{formatCurrency(os.totalServicos)}</span>
              </div>
              {os.desconto > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Desconto:</span>
                  <span>- {formatCurrency(os.desconto)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #111827', paddingTop: '4px', marginTop: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                <span>VALOR TOTAL:</span>
                <span style={{ color: '#16a34a' }}>{formatCurrency(os.valorTotalOS)}</span>
              </div>
            </div>
          </div>

          {/* Termo de Garantia e Assinaturas */}
          <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '10px', fontSize: '10px', color: '#4b5563', marginBottom: '30px' }}>
            <strong>TERMO DE GARANTIA E ACEITE:</strong> {os.termoGarantia} Os serviços e peças descritos foram conferidos e aprovados pelo cliente.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', textAlign: 'center', marginTop: '20px' }}>
            <div>
              <div style={{ borderTop: '1px solid #111827', paddingTop: '4px' }}>
                <strong>COLISEU MATERIAIS & SERVIÇOS</strong>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>Responsável Técnico: {os.tecnicoPrincipal}</div>
              </div>
            </div>

            <div>
              <div style={{ borderTop: '1px solid #111827', paddingTop: '4px' }}>
                <strong>{os.clienteNome}</strong>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>Assinatura do Cliente / Aceite</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
