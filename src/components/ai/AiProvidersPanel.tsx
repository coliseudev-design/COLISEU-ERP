import React, { useEffect, useState } from 'react';
import { listLlmProviders, setLlmProviderKey, pingLlmProvider, LlmProviderInfo } from '../../lib/ai_providers';
import { getWhatsAppConfig, salvarWhatsAppConfig, enviarMensagemWhatsApp, WhatsAppConfigInfo } from '../../lib/whatsapp';
import { Cpu, CheckCircle2, XCircle, Key, RefreshCw, MessageSquare, Send, Shield, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export const AiProvidersPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'llm' | 'whatsapp'>('llm');

  // LLM State
  const [providers, setProviders] = useState<LlmProviderInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<LlmProviderInfo | null>(null);
  const [inputKey, setInputKey] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // WhatsApp State
  const [waConfig, setWaConfig] = useState<WhatsAppConfigInfo | null>(null);
  const [waSession, setWaSession] = useState('coliseu_principal');
  const [waUrl, setWaUrl] = useState('http://localhost:8080/message/sendText/coliseu');
  const [waKey, setWaKey] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waAutoReply, setWaAutoReply] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestMsg, setWaTestMsg] = useState('🤖 [Coliseu ERP]: Teste de mensagem via WhatsApp Gateway ativo!');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<string | null>(null);

  const loadProviders = async () => {
    setLoading(true);
    const data = await listLlmProviders();
    setProviders(data);
    const wa = await getWhatsAppConfig('fil1');
    if (wa) {
      setWaConfig(wa);
      setWaSession(wa.session_name);
      if (wa.api_url) setWaUrl(wa.api_url);
      if (wa.phone_number) setWaPhone(wa.phone_number);
      setWaAutoReply(wa.auto_reply_enabled);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProvider(null);
      }
    };
    if (selectedProvider) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProvider]);

  const handleSaveKey = async () => {
    if (!selectedProvider) return;
    setTesting(true);
    setTestResult(null);

    const res = await setLlmProviderKey(selectedProvider.provider_type, inputKey, inputUrl || undefined);
    setTesting(false);

    if (res.ok) {
      setTestResult(`✅ Sucesso! (${res.latency_ms}ms) ${res.reason}`);
      setInputKey('');
      loadProviders();
    } else {
      setTestResult(`❌ Erro: ${res.reason}`);
    }
  };

  const handlePing = async (pType: string) => {
    setTesting(true);
    const res = await pingLlmProvider(pType);
    setTesting(false);
    alert(`Status ${pType.toUpperCase()}: ${res.ok ? 'CONECTADO (' + res.latency_ms + 'ms)' : 'DESCONECTADO'} - ${res.reason}`);
    loadProviders();
  };

  const handleSaveWhatsApp = async () => {
    setWaSending(true);
    try {
      await salvarWhatsAppConfig('fil1', waSession, waUrl, waKey, waPhone, waAutoReply);
      setWaResult('✅ Configurações do WhatsApp salvas com sucesso!');
      loadProviders();
    } catch (err: any) {
      setWaResult(`❌ Falha ao salvar: ${err?.message || err}`);
    } finally {
      setWaSending(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!waTestPhone.trim() || !waTestMsg.trim()) return;
    setWaSending(true);
    setWaResult(null);
    try {
      const res = await enviarMensagemWhatsApp('fil1', waTestPhone, waTestMsg);
      if (res.success) {
        setWaResult(`✅ Sucesso! Mensagem enviada para ${waTestPhone} (ID: ${res.message_id})`);
      } else {
        setWaResult(`❌ Falha: ${res.reason}`);
      }
    } catch (err: any) {
      setWaResult(`❌ Erro de envio: ${err?.message || err}`);
    } finally {
      setWaSending(false);
    }
  };

  return (
    <div className="coliseu-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Cpu size={28} color="var(--action-primary)" aria-hidden="true" />
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>Central de Integração de IA & WhatsApp Gateway</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
              Gerencie provedores LLM (OpenAI, Anthropic, Gemini, DeepSeek, Ollama) e gateway de mensagens WhatsApp.
            </p>
          </div>
        </div>

        {/* SubTab Toggle */}
        <div className="coliseu-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeSubTab === 'llm'}
            className={`coliseu-tab ${activeSubTab === 'llm' ? 'coliseu-tab--active' : ''}`}
            onClick={() => setActiveSubTab('llm')}
          >
            <Cpu size={14} aria-hidden="true" /> Provedores LLM
          </button>
          <button
            role="tab"
            aria-selected={activeSubTab === 'whatsapp'}
            className={`coliseu-tab ${activeSubTab === 'whatsapp' ? 'coliseu-tab--active' : ''}`}
            onClick={() => setActiveSubTab('whatsapp')}
          >
            <MessageSquare size={14} aria-hidden="true" /> WhatsApp Gateway
          </button>
        </div>
      </div>

      {/* SubTab: LLM Providers */}
      {activeSubTab === 'llm' && (
        loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Carregando provedores de IA...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {providers.map((p) => {
              const isConnected = p.status === 'CONECTADO';
              return (
                <div
                  key={p.id}
                  className="coliseu-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{p.name}</div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isConnected ? '#10b981' : '#ef4444',
                          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          borderRadius: '9999px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        {isConnected ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {p.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>{p.status_reason}</p>

                    <div style={{ fontSize: '12px', marginBottom: '16px' }}>
                      <strong style={{ color: '#cbd5e1' }}>Modelos Suportados:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {p.models.map((m, idx) => (
                          <span key={idx} style={{ backgroundColor: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#38bdf8' }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => {
                        setSelectedProvider(p);
                        setInputUrl(p.api_url || '');
                        setTestResult(null);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Key size={14} /> Configurar Chave
                    </button>
                    <button
                      onClick={() => handlePing(p.provider_type)}
                      style={{
                        backgroundColor: '#334155',
                        color: '#f8fafc',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <RefreshCw size={14} /> Testar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* SubTab: WhatsApp Gateway */}
      {activeSubTab === 'whatsapp' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Form de Configuração */}
          <div className="coliseu-card">
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} color="var(--status-success)" aria-hidden="true" /> Configuração do Gateway WhatsApp
            </h2>

            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome da Sessão</label>
            <input
              type="text"
              value={waSession}
              onChange={(e) => setWaSession(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', marginBottom: '14px' }}
            />

            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>URL da API (Evolution API / Meta Cloud API)</label>
            <input
              type="text"
              value={waUrl}
              onChange={(e) => setWaUrl(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', marginBottom: '14px' }}
            />

            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>API Key / Token Encriptado em Repouso</label>
            <input
              type="password"
              placeholder="Cole sua API Key do WhatsApp..."
              value={waKey}
              onChange={(e) => setWaKey(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', marginBottom: '14px' }}
            />

            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Número do Celular Conectado</label>
            <input
              type="text"
              placeholder="(67) 99999-0000"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', marginBottom: '14px' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <input
                type="checkbox"
                id="autoReply"
                checked={waAutoReply}
                onChange={(e) => setWaAutoReply(e.target.checked)}
              />
              <label htmlFor="autoReply" style={{ fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
                Ativar auto-resposta inteligente via Coliseu AI Engine
              </label>
            </div>

            <Button variant="primary" onClick={handleSaveWhatsApp} isLoading={waSending}>
              Salvar Configuração WhatsApp
            </Button>
          </div>

          {/* Teste de Disparo ao Vivo */}
          <div className="coliseu-card">
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={20} color="var(--action-primary)" aria-hidden="true" /> Disparo de Teste ao Vivo
            </h2>

            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Telefone Destino (com DDD)</label>
            <input
              type="text"
              placeholder="5567999990000"
              value={waTestPhone}
              onChange={(e) => setWaTestPhone(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', marginBottom: '14px' }}
            />

            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Conteúdo da Mensagem</label>
            <textarea
              rows={4}
              value={waTestMsg}
              onChange={(e) => setWaTestMsg(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', marginBottom: '16px' }}
            />

            {waResult && (
              <div style={{ fontSize: '12px', padding: '12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', marginBottom: '16px', color: waResult.startsWith('✅') ? '#10b981' : '#ef4444' }}>
                {waResult}
              </div>
            )}

            <Button variant="primary" leftIcon={<Send size={14} />} onClick={handleSendTestWhatsApp} isLoading={waSending}>
              Disparar Mensagem WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Chave API */}
      {selectedProvider && (
        <div className="coliseu-overlay" onClick={() => setSelectedProvider(null)}>
          <div className="coliseu-modal coliseu-modal--md" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Configurar {selectedProvider.name}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              A chave API será encriptada em repouso no banco SQLCipher local com salt seguro.
            </p>

            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Chave API</label>
            <input
              type="password"
              placeholder="Cole sua chave API aqui..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', marginBottom: '16px' }}
            />

            {selectedProvider.provider_type === 'ollama' && (
              <>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>URL Personalizada (Servidor Local Ollama)</label>
                <input
                  type="text"
                  placeholder="http://localhost:11434/api/tags"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', marginBottom: '16px' }}
                />
              </>
            )}

            {testResult && <div style={{ fontSize: '12px', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', marginBottom: '16px', color: testResult.startsWith('✅') ? '#10b981' : '#ef4444' }}>{testResult}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setSelectedProvider(null)} style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSaveKey} disabled={testing} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                {testing ? 'Testando Conexão...' : 'Salvar & Testar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
