import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AIInsight } from '../components/ui/AIComponents';
import { formatDate } from '../lib/formatters';
import { Search, ShieldCheck, Activity } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const logs = [
    { id: 'LOG-9012', data: '2026-08-14 14:20:00', usuario: 'Carlos Eduardo Piveta', acao: 'ALTERACAO_LIMITE_CREDITO', entidade: 'Cliente cli-1', traceId: 'corr_9a8b7c6d' },
    { id: 'LOG-9011', data: '2026-08-14 12:36:50', usuario: 'Mariana Santos', acao: 'EMISSAO_NFSE_NACIONAL', entidade: 'NFS-e 1', traceId: 'corr_1a2b3c4d' },
  ];

  return (
    <div className="coliseu-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Trilha de Auditoria Funcional & Rastreabilidade"
        description="Registro imutável de todas as ações de sistema com CorrelationId, usuário, dados anteriores e posteriores."
        breadcrumbItems={[
          { label: 'Administração', active: false },
          { label: 'Auditoria Funcional', active: true },
        ]}
      />

      <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '360px' }}>
          <Input
            placeholder="Buscar por CorrelationId, Usuário ou Ação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={14} aria-hidden="true" />}
          />
        </div>

        <div className="coliseu-table-container">
          <table className="coliseu-table">
            <thead>
              <tr>
                <th>TraceId / Evento</th>
                <th>Data & Hora</th>
                <th>Operador / Usuário</th>
                <th>Ação Executada</th>
                <th>Entidade Afetada</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600, color: 'var(--action-primary)' }} className="tabular-nums">{l.traceId}</td>
                  <td>{formatDate(l.data, 'datetime')}</td>
                  <td style={{ fontWeight: 600 }}>{l.usuario}</td>
                  <td><span style={{ backgroundColor: 'var(--surface-1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-default)', fontSize: '11px', color: 'var(--status-success)' }}>{l.acao}</span></td>
                  <td>{l.entidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AIInsight
        title="✦ Auditoria de Rastreabilidade End-to-End (§54)"
        message="100% dos eventos registrados possuem CorrelationId de rastreio contínuo conectando a requisição IPC da UI ao banco de dados SQLCipher."
      />
    </div>
  );
};
