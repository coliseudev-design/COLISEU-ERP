import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, FileText, CheckCircle2, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';
import { reportsService, BIExecutivoData } from '../../lib/reports';

export interface CopilotIaModalProps {
  isOpen: boolean;
  onClose: () => void;
  biData: BIExecutivoData | null;
}

export const CopilotIaModal: React.FC<CopilotIaModalProps> = ({
  isOpen,
  onClose,
  biData,
}) => {
  const [pergunta, setPergunta] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resposta, setResposta] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConsultarIa = async (customPrompt?: string) => {
    const promptToSend = customPrompt || pergunta;
    if (!promptToSend.trim()) return;

    setIsLoading(true);
    try {
      const resumoJson = JSON.stringify({
        periodo: `${biData?.data_inicio} até ${biData?.data_fim}`,
        filial: biData?.filial_id,
        kpis: biData?.kpis,
        ranking_vendedores: biData?.ranking_vendedores,
        top_produtos_curva_a: biData?.curva_abc_produtos?.slice(0, 5),
        alertas: biData?.alertas_estrategicos,
      });

      const res = await reportsService.analisarBiComIa(resumoJson, promptToSend);
      setResposta(res);
    } catch (err) {
      console.error('Erro ao consultar IA executiva:', err);
      setResposta('Erro de comunicação com o motor de IA. Verifique as configurações de provedor LLM.');
    } finally {
      setIsLoading(false);
    }
  };

  const promptsSugeridos = [
    'Qual estratégia para elevar o ticket médio e a margem bruta?',
    'Analisar a liquidez e risco de descasamento no fluxo de caixa',
    'Quais produtos da Curva A demandam reposição urgente?',
    'Como otimizar a performance dos vendedores abaixo da meta?',
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-4)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header com Gradiente Executivo */}
        <div
          style={{
            padding: 'var(--spacing-3) var(--spacing-4)',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(124, 58, 237, 0.06) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                border: '1px solid rgba(79, 70, 229, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Coliseu Executive AI Copilot
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    color: '#6366f1',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  BI Inteligente 360°
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Consultoria estratégica autônoma e diagnóstico preditivo em tempo real
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div
          style={{
            padding: 'var(--spacing-4)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)',
            flex: 1,
          }}
        >
          {/* Diagnóstico Inicial Autônomo */}
          <div
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-3) var(--spacing-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Bot size={16} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Diagnóstico Estratégico Consolidado
              </span>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}
            >
              {biData?.resumo_ia_diagnostico || 'Carregando dados do BI para diagnóstico executivo...'}
            </div>
          </div>

          {/* Resposta de Pergunta Específica da IA */}
          {resposta && (
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-3) var(--spacing-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={16} style={{ color: '#6366f1' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1' }}>
                  Análise Especializada para sua Consulta
                </span>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {resposta}
              </div>
            </div>
          )}

          {/* Sugestões de Perguntas Rápidas */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              PERGUNTAS ESTRATÉGICAS SUGERIDAS:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {promptsSugeridos.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPergunta(prompt);
                    handleConsultarIa(prompt);
                  }}
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--surface-sunken)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Bar para Chat Livre */}
        <div
          style={{
            padding: 'var(--spacing-3) var(--spacing-4)',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-1)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Faça uma pergunta executiva sobre o faturamento, margens, inadimplência ou vendas..."
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) handleConsultarIa();
            }}
            disabled={isLoading}
            style={{
              flex: 1,
              backgroundColor: 'var(--surface-sunken)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xs)',
              padding: '6px 12px',
              fontSize: '12px',
              outline: 'none',
            }}
          />

          <button
            type="button"
            onClick={() => handleConsultarIa()}
            disabled={isLoading || !pergunta.trim()}
            className="coliseu-btn coliseu-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Analisar com IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
