import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import {
  CteItem,
  VeiculoItem,
  MotoristaItem,
  RotaTransporteItem,
  transporteService,
} from '../lib/transporte';
import { ModalEmissaoCTe } from '../components/transporte/ModalEmissaoCTe';
import { ModalEmissaoRapidaCTe } from '../components/transporte/ModalEmissaoRapidaCTe';
import { ModalVisualizadorDacte } from '../components/transporte/ModalVisualizadorDacte';

export const CteEmissaoPage: React.FC = () => {
  const [ctes, setCtes] = useState<CteItem[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoItem[]>([]);
  const [motoristas, setMotoristas] = useState<MotoristaItem[]>([]);
  const [rotas, setRotas] = useState<RotaTransporteItem[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isModalCteOpen, setIsModalCteOpen] = useState(false);
  const [isModalCteRapidoOpen, setIsModalCteRapidoOpen] = useState(false);
  const [isModalDacteOpen, setIsModalDacteOpen] = useState(false);
  const [cteSelecionado, setCteSelecionado] = useState<CteItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const carregarDados = async () => {
    try {
      const [c, v, m, r] = await Promise.all([
        transporteService.listarCtes('fil_matriz_01'),
        transporteService.listarVeiculos('emp_matriz_01'),
        transporteService.listarMotoristas('emp_matriz_01'),
        transporteService.listarRotas('emp_matriz_01'),
      ]);
      setCtes(c);
      setVeiculos(v);
      setMotoristas(m);
      setRotas(r);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCancelar = async (cte: CteItem) => {
    const motivo = prompt('Informe a justificativa do cancelamento (mínimo 15 caracteres):');
    if (!motivo || motivo.length < 15) {
      alert('Justificativa inválida ou muito curta.');
      return;
    }
    await transporteService.cancelarCte(cte.id, motivo);
    showToast(`CT-e nº ${cte.numero_cte} cancelado na SEFAZ com sucesso!`);
    carregarDados();
  };

  const ctesFiltrados = ctes.filter((c) => {
    const matchBusca =
      c.numero_cte.toString().includes(busca) ||
      (c.destinatario_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (c.chave_acesso || '').includes(busca);
    const matchStatus = filtroStatus === 'TODOS' || c.status_sefaz === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Gerenciamento & Emissão de CT-e (Modelo 57)"
        description="Conhecimentos de Transporte Eletrônico versão 4.00, cálculo de frete, componentes tarifários e DACTE."
        breadcrumbItems={[
          { label: 'Transporte', active: false },
          { label: 'CT-e', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => setIsModalCteRapidoOpen(true)}
            leftIcon={<Zap size={14} color="#f59e0b" />}
          >
            CT-e Rápido
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalCteOpen(true)}
            leftIcon={<Plus size={14} />}
            style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
          >
            Emitir Novo CT-e (F10)
          </Button>
        </div>
      </PageHeader>

      <div className="coliseu-card" style={{ padding: '16px' }}>
        {/* Filtros e Busca */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                className="coliseu-input"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por Nº, Destinatário ou Chave..."
                style={{ height: '34px', paddingLeft: '30px', width: '100%' }}
              />
            </div>

            <select
              className="coliseu-input"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{ height: '34px', width: '160px' }}
            >
              <option value="TODOS">Todos os Status</option>
              <option value="AUTORIZADO">Autorizados</option>
              <option value="CANCELADO">Cancelados</option>
              <option value="DIGITACAO">Em Digitação</option>
            </select>
          </div>

          <Button variant="secondary" onClick={carregarDados} leftIcon={<RefreshCw size={14} />} style={{ height: '34px' }}>
            Atualizar
          </Button>
        </div>

        {/* Tabela de CT-es */}
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Nº CT-e</th>
                <th style={{ width: '60px' }}>Série</th>
                <th style={{ width: '90px' }}>Emissão</th>
                <th>Tomador / Destinatário</th>
                <th style={{ width: '130px' }}>Origem / Destino</th>
                <th style={{ width: '90px' }}>Veículo</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Valor Carga</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Valor Frete</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {ctesFiltrados.map((cte) => (
                <tr key={cte.id}>
                  <td style={{ fontWeight: 800, color: '#3b82f6' }}>CT-e {cte.numero_cte}</td>
                  <td>{cte.serie}</td>
                  <td>{cte.data_emissao}</td>
                  <td style={{ fontWeight: 600 }}>{cte.destinatario_nome}</td>
                  <td>{cte.uf_inicio} ➔ {cte.uf_fim} ({cte.municipio_fim})</td>
                  <td style={{ fontWeight: 700 }}>{cte.veiculo_placa || 'HQH-4490'}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(cte.valor_carga)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                    {formatCurrency(cte.valor_total_prestacao)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: cte.status_sefaz === 'AUTORIZADO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: cte.status_sefaz === 'AUTORIZADO' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {cte.status_sefaz}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setCteSelecionado(cte);
                          setIsModalDacteOpen(true);
                        }}
                        style={{ height: '26px', fontSize: '10px', padding: '0 8px' }}
                      >
                        DACTE
                      </Button>
                      {cte.status_sefaz === 'AUTORIZADO' && (
                        <Button
                          variant="secondary"
                          onClick={() => handleCancelar(cte)}
                          style={{ height: '26px', fontSize: '10px', padding: '0 8px', color: '#ef4444' }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {ctesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum Conhecimento de Transporte Eletrônico encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalEmissaoCTe
        isOpen={isModalCteOpen}
        onClose={() => setIsModalCteOpen(false)}
        onEmissaoSucesso={(novo) => {
          showToast(`CT-e nº ${novo.numero_cte} emitido com sucesso!`);
          carregarDados();
        }}
        veiculos={veiculos}
        motoristas={motoristas}
        rotas={rotas}
      />

      <ModalEmissaoRapidaCTe
        isOpen={isModalCteRapidoOpen}
        onClose={() => setIsModalCteRapidoOpen(false)}
        onEmissaoSucesso={(novo) => {
          showToast(`CT-e Express nº ${novo.numero_cte} emitido!`);
          carregarDados();
        }}
        veiculos={veiculos}
        motoristas={motoristas}
      />

      <ModalVisualizadorDacte
        isOpen={isModalDacteOpen}
        onClose={() => setIsModalDacteOpen(false)}
        cte={cteSelecionado}
      />
    </div>
  );
};
