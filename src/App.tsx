import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SidebarNav } from './components/shell/SidebarNav';
import { AppHeader } from './components/shell/AppHeader';
import { CommandBarModal } from './components/ui/CommandBarModal';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ThemeProvider } from './lib/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';

// Páginas do Sistema
import { DashboardPage } from './pages/DashboardPage';
import { PessoasPage } from './pages/PessoasPage';
import { ProductsPage } from './pages/ProductsPage';
import { FichaProdutoPage } from './pages/FichaProdutoPage';
import { PDVPage } from './pages/PDVPage';
import { PreVendaPage } from './pages/PreVendaPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { PedidosVendasPage } from './pages/PedidosVendasPage';
import { CondicionalPage } from './pages/CondicionalPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { XmlEntradaPage } from './pages/XmlEntradaPage';
import { InventoryPage } from './pages/InventoryPage';
import { StockTransferPage } from './pages/StockTransferPage';
import { GradesPage } from './pages/GradesPage';
import { EtiquetasPage } from './pages/EtiquetasPage';
import { FinancialPage } from './pages/FinancialPage';
import { DrePage } from './pages/DrePage';
import { OfxPage } from './pages/OfxPage';
import { PixBoletoPage } from './pages/PixBoletoPage';
import { CaixasPage } from './pages/CaixasPage';
import { ContasBancariasPage } from './pages/ContasBancariasPage';
import { SpedPage } from './pages/SpedPage';
import { TaxRulesPage } from './pages/TaxRulesPage';
import { NaturezasOperacaoPage } from './pages/NaturezasOperacaoPage';
import { DfePage } from './pages/DfePage';
import { GerenciamentoNFePage } from './pages/GerenciamentoNFePage';
import { GerenciamentoNFCePage } from './pages/GerenciamentoNFCePage';
import { GerenciamentoMDFePage } from './pages/GerenciamentoMDFePage';
import { ReportsPage } from './pages/ReportsPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { UsersPage } from './pages/UsersPage';
import { GruposAcessoPage } from './pages/GruposAcessoPage';
import { CategoriasMarcasPage } from './pages/CategoriasMarcasPage';
import { BalancoEstoquePage } from './pages/BalancoEstoquePage';
import { ReajustePrecosLotePage } from './pages/ReajustePrecosLotePage';
import { LotesRastreabilidadePage } from './pages/LotesRastreabilidadePage';
import { OrdensServicoPage } from './pages/OrdensServicoPage';
import { Fornecedores360Page } from './pages/Fornecedores360Page';
import { ContasPagarPage } from './pages/ContasPagarPage';
import { ComissoesMetasPage } from './pages/ComissoesMetasPage';
import { FluxoCaixaProjetadoPage } from './pages/FluxoCaixaProjetadoPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { AiProvidersPanel } from './components/ai/AiProvidersPanel';

// Módulo de Transporte & Logística
import { TransportePage } from './pages/TransportePage';
import { CteEmissaoPage } from './pages/CteEmissaoPage';
import { CteGerenciamentoPage } from './pages/CteGerenciamentoPage';
import { FrotaVeiculosPage } from './pages/FrotaVeiculosPage';
import { MotoristasPage } from './pages/MotoristasPage';

function MainAppShell() {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Mapeamento de tabKey baseado no pathname
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const handleNavigateTab = (tabKey: string) => {
    navigate(`/${tabKey}`);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--surface-app)', color: 'var(--text-primary)' }}>
      {/* Sidebar Nav com Suporte a Colapso, Busca e Favoritos */}
      <SidebarNav
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AppHeader
          onOpenCommandBar={() => setIsCommandBarOpen(true)}
          activeTab={activeTab}
        />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--surface-app)' }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<DashboardPage onNavigate={handleNavigateTab} />} />
              <Route path="/dashboard" element={<DashboardPage onNavigate={handleNavigateTab} />} />
              <Route path="/pessoas" element={<PessoasPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/produtos/:id" element={<FichaProdutoPage />} />
              <Route path="/pdv" element={<PDVPage />} />
              <Route path="/pre_venda" element={<PreVendaPage />} />
              <Route path="/sales" element={<SalesHistoryPage />} />
              <Route path="/pedidos_vendas" element={<PedidosVendasPage />} />
              <Route path="/ordens_servico" element={<OrdensServicoPage />} />
              <Route path="/comissoes_metas" element={<ComissoesMetasPage />} />
              <Route path="/condicional" element={<CondicionalPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/fornecedores_360" element={<Fornecedores360Page />} />
              <Route path="/xml_entrada" element={<XmlEntradaPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/lotes" element={<LotesRastreabilidadePage />} />
              <Route path="/balanco_estoque" element={<BalancoEstoquePage />} />
              <Route path="/reajuste_precos" element={<ReajustePrecosLotePage />} />
              <Route path="/categorias_marcas" element={<CategoriasMarcasPage />} />
              <Route path="/stock_transfer" element={<StockTransferPage />} />
              <Route path="/grades" element={<GradesPage />} />
              <Route path="/etiquetas" element={<EtiquetasPage />} />
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/contas_pagar" element={<ContasPagarPage />} />
              <Route path="/fluxo_caixa_projetado" element={<FluxoCaixaProjetadoPage />} />
              <Route path="/dre" element={<DrePage />} />
              <Route path="/ofx" element={<OfxPage />} />
              <Route path="/pix_boleto" element={<PixBoletoPage />} />
              <Route path="/caixas" element={<CaixasPage />} />
              <Route path="/contas_bancarias" element={<ContasBancariasPage />} />
              <Route path="/sped" element={<SpedPage />} />
              <Route path="/emissao_dfe" element={<DfePage />} />
              <Route path="/mdfe" element={<DfePage />} />
              <Route path="/tax_rules" element={<TaxRulesPage />} />
              <Route path="/naturezas_operacao" element={<NaturezasOperacaoPage />} />
              <Route path="/gerenciamento_nfe" element={<GerenciamentoNFePage />} />
              <Route path="/gerenciamento_nfce" element={<GerenciamentoNFCePage />} />
              <Route path="/gerenciamento_mdfe" element={<GerenciamentoMDFePage />} />
              <Route path="/transporte" element={<TransportePage />} />
              <Route path="/transporte/cte" element={<CteEmissaoPage />} />
              <Route path="/cte" element={<CteEmissaoPage />} />
              <Route path="/transporte/cte/config" element={<CteGerenciamentoPage />} />
              <Route path="/gerenciamento_cte" element={<CteGerenciamentoPage />} />
              <Route path="/transporte/frota" element={<FrotaVeiculosPage />} />
              <Route path="/frota" element={<FrotaVeiculosPage />} />
              <Route path="/transporte/motoristas" element={<MotoristasPage />} />
              <Route path="/motoristas" element={<MotoristasPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/grupos_acesso" element={<GruposAcessoPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
              <Route path="/ai_providers" element={<AiProvidersPanel />} />
              <Route path="*" element={<DashboardPage onNavigate={handleNavigateTab} />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Command Bar Modal (Ctrl + K) */}
      <CommandBarModal
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        onNavigate={(tab) => {
          handleNavigateTab(tab);
          setIsCommandBarOpen(false);
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <MainAppShell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
