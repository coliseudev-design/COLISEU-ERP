import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  Search,
  User,
  X,
  Check,
  Phone,
  MapPin,
  CreditCard,
  Building,
  Truck,
  Users,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import migratedPessoasData from '../../data/migrated_pessoas.json';

export interface ClienteItemBusca {
  id: string;
  codigo: string;
  nome: string;
  nomeFantasia?: string;
  tipo: string; // 'CLIENTE' | 'FORNECEDOR' | 'PRODUTOR' | 'TRANSPORTADOR' | 'REVENDEDOR' | 'CLIENTE & FORNECEDOR'
  cpfCnpj: string;
  inscricaoEstadual?: string;
  endereco: string;
  numero?: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email?: string;
  limiteCredito: number;
  saldoDevedor: number;
  status: 'Ativo' | 'Bloqueado' | 'Em Análise' | 'Inativo';
}

const CONSUMIDOR_PADRAO: ClienteItemBusca = {
  id: 'pes-00001',
  codigo: '1',
  nome: 'AO CONSUMIDOR',
  nomeFantasia: 'VENDA BALCÃO / CONSUMIDOR FINAL',
  tipo: 'CLIENTE',
  cpfCnpj: '00.000.000/0000-00',
  inscricaoEstadual: 'ISENTO',
  endereco: 'RUA PRINCIPAL',
  numero: '100',
  bairro: 'CENTRO',
  cidade: 'DOURADOS',
  uf: 'MS',
  telefone: '(67) 3421-0000',
  email: 'balcao@coliseuerp.com.br',
  limiteCredito: 5000.0,
  saldoDevedor: 0,
  status: 'Ativo',
};

// Carregamento e normalização de toda a carteira de clientes, fornecedores e parceiros
function carregarCarteiraCompleta(): ClienteItemBusca[] {
  const lista: ClienteItemBusca[] = [CONSUMIDOR_PADRAO];

  if (Array.isArray(migratedPessoasData)) {
    for (const p of migratedPessoasData as any[]) {
      if (!p) continue;
      // Evitar duplicata do código 1
      if (p.codigo === '1' || p.codigo === '001') {
        if (p.nome !== 'AO CONSUMIDOR') {
          lista.push({
            id: p.id || `pes-${p.codigo}`,
            codigo: p.codigo || '001',
            nome: p.nome || 'SEM NOME',
            nomeFantasia: p.nomeAbrev || '',
            tipo: p.tipo || 'CLIENTE',
            cpfCnpj: p.cpfCnpj || '',
            inscricaoEstadual: p.inscEstadual || '',
            endereco: p.endereco || '',
            numero: p.numero || '',
            bairro: p.bairro || '',
            cidade: p.municipio || 'DOURADOS',
            uf: p.uf || 'MS',
            telefone: p.telefone || p.celularWhats || p.foneRes || '',
            email: p.emailPrincipal || p.emailFinanceiro || '',
            limiteCredito: p.limiteCredito || 0,
            saldoDevedor: p.totalGeralDevido || p.creditoUtilizado || 0,
            status: p.status || 'Ativo',
          });
        }
        continue;
      }

      lista.push({
        id: p.id || `pes-${p.codigo}`,
        codigo: p.codigo || '',
        nome: p.nome || 'SEM NOME',
        nomeFantasia: p.nomeAbrev || '',
        tipo: p.tipo || 'CLIENTE',
        cpfCnpj: p.cpfCnpj || '',
        inscricaoEstadual: p.inscEstadual || '',
        endereco: p.endereco || '',
        numero: p.numero || '',
        bairro: p.bairro || '',
        cidade: p.municipio || 'DOURADOS',
        uf: p.uf || 'MS',
        telefone: p.telefone || p.celularWhats || p.foneRes || '',
        email: p.emailPrincipal || p.emailFinanceiro || '',
        limiteCredito: p.limiteCredito || 0,
        saldoDevedor: p.totalGeralDevido || p.creditoUtilizado || 0,
        status: p.status || 'Ativo',
      });
    }
  }

  return lista;
}

interface ModalBuscaClientesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCliente: (cliente: ClienteItemBusca) => void;
}

export const ModalBuscaClientes: React.FC<ModalBuscaClientesProps> = ({
  isOpen,
  onClose,
  onSelectCliente,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [todosParceiros] = useState<ClienteItemBusca[]>(carregarCarteiraCompleta);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Filtragem Otimizada com Limite dos Primeiros 100 Registros para Máxima Fluidez
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    const qNumeros = q.replace(/\D/g, '');

    return todosParceiros
      .filter((c) => {
        // Filtro de Tipo (Clientes / Fornecedores / etc)
        if (filtroTipo === 'CLIENTES' && !c.tipo.toUpperCase().includes('CLIENTE')) return false;
        if (filtroTipo === 'FORNECEDORES' && !c.tipo.toUpperCase().includes('FORNECEDOR')) return false;
        if (filtroTipo === 'PRODUTORES' && !c.tipo.toUpperCase().includes('PRODUTOR')) return false;
        if (filtroTipo === 'TRANSPORTADORES' && !c.tipo.toUpperCase().includes('TRANSPORTADOR')) return false;
        if (filtroTipo === 'REVENDEDORES' && !c.tipo.toUpperCase().includes('REVENDEDOR')) return false;

        if (!q) return true;

        const matchNome = c.nome.toLowerCase().includes(q);
        const matchFantasia = c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(q);
        const matchCod = c.codigo.toLowerCase().includes(q);
        const matchCidade = c.cidade.toLowerCase().includes(q);
        const matchEnd = c.endereco.toLowerCase().includes(q) || c.bairro.toLowerCase().includes(q);
        const matchTel = c.telefone.includes(q);
        const matchCpf = c.cpfCnpj.toLowerCase().includes(q) || (qNumeros && c.cpfCnpj.replace(/\D/g, '').includes(qNumeros));

        return matchNome || matchFantasia || matchCod || matchCidade || matchEnd || matchTel || matchCpf;
      })
      .slice(0, 100); // Limite de 100 itens renderizados simultaneamente para resposta instantânea
  }, [todosParceiros, busca, filtroTipo]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [busca, filtroTipo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(filtrados.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtrados[selectedIndex]) {
        onSelectCliente(filtrados[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 13000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '90vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} color="#3b82f6" />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Pesquisa Completa da Carteira de Clientes & Fornecedores (F8)
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Base cadastral com <strong>{todosParceiros.length}</strong> parceiros • Navegue com <strong>[↑] [↓]</strong> e pressione <strong>[Enter]</strong> para selecionar.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Filtros de Categoria */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>Filtrar por:</span>
          {[
            { key: 'TODOS', label: 'Todos os Parceiros' },
            { key: 'CLIENTES', label: '👤 Somente Clientes' },
            { key: 'FORNECEDORES', label: '🏭 Fornecedores' },
            { key: 'PRODUTORES', label: '🌱 Produtores Rurais' },
            { key: 'TRANSPORTADORES', label: '🚚 Transportadoras' },
            { key: 'REVENDEDORES', label: '🏪 Revendas' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFiltroTipo(tab.key)}
              style={{
                border: 'none',
                background: filtroTipo === tab.key ? '#3b82f6' : 'var(--surface-3)',
                color: filtroTipo === tab.key ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input de Busca Rápida */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#3b82f6' }} />
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="DIGITE RAZÃO SOCIAL, NOME FANTASIA, CPF/CNPJ, CÓDIGO, CIDADE OU TELEFONE..."
              className="coliseu-input"
              style={{ width: '100%', height: '38px', paddingLeft: '36px', fontSize: '12px', fontWeight: 700 }}
            />
          </div>
        </div>

        {/* Tabela de Resultados com Scroll */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="coliseu-table" style={{ fontSize: '11px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>Cód</th>
                <th>Razão Social / Nome Fantasia & Endereço</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Tipo</th>
                <th style={{ width: '140px' }}>CNPJ / CPF</th>
                <th style={{ width: '130px' }}>Cidade / UF</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Limite Crédito</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '85px', textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <tr
                    key={c.id}
                    onClick={() => {
                      onSelectCliente(c);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    }}
                  >
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-link)', fontSize: '12px' }}>
                      {c.codigo}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: isSelected ? '#3b82f6' : 'var(--text-primary)' }}>
                        {c.nome}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {c.nomeFantasia ? `Fantasia: ${c.nomeFantasia} • ` : ''}
                        {c.endereco ? `${c.endereco}, ${c.numero || ''} ${c.bairro ? `(${c.bairro})` : ''} • ` : ''}
                        Tel: {c.telefone || 'Sem fone'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor:
                            c.tipo.includes('CLIENTE')
                              ? 'rgba(59, 130, 246, 0.15)'
                              : c.tipo.includes('FORNECEDOR')
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(234, 179, 8, 0.15)',
                          color:
                            c.tipo.includes('CLIENTE')
                              ? '#3b82f6'
                              : c.tipo.includes('FORNECEDOR')
                              ? '#10b981'
                              : '#eab308',
                        }}
                      >
                        {c.tipo}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.cpfCnpj}</td>
                    <td>{c.cidade}/{c.uf}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(c.limiteCredito)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: c.status === 'Ativo' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: c.status === 'Ativo' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Button
                        variant={isSelected ? 'primary' : 'secondary'}
                        size="sm"
                        style={{ height: '24px', fontSize: '10px', padding: '0 8px' }}
                      >
                        Selecionar
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Nenhum parceiro encontrado com o termo digitado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé Informativo */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Exibindo <strong>{filtrados.length}</strong> de <strong>{todosParceiros.length}</strong> parceiros cadastrados
          </div>
          <div>
            Pressione <strong>[Enter]</strong> para confirmar ou <strong>[ESC]</strong> para fechar
          </div>
        </div>
      </div>
    </div>
  );
};
