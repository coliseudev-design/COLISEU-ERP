import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Funcionario, GrupoAcessoPermissao, FuncionarioFilial, LoginResult, funcionariosService } from '../lib/funcionarios';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  funcionario: Funcionario | null;
  permissoes: GrupoAcessoPermissao[];
  filiaisPermitidas: FuncionarioFilial[];
  filialAtiva: string | null;
  login: (username: string, senha: string) => Promise<void>;
  logout: () => void;
  temPermissao: (permissaoKey: string) => boolean;
  trocarFilial: (filialId: string) => void;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialização a partir do sessionStorage (persiste F5, mas exige login ao reabrir o navegador)
  const getSavedSession = () => {
    try {
      const raw = sessionStorage.getItem('coliseu_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const initialSession = getSavedSession();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!initialSession?.funcionario);
  const [isLoading, setIsLoading] = useState(false);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(() => initialSession?.funcionario || null);
  const [permissoes, setPermissoes] = useState<GrupoAcessoPermissao[]>(() => initialSession?.permissoes || []);
  const [filiaisPermitidas, setFiliaisPermitidas] = useState<FuncionarioFilial[]>(() => initialSession?.filiais_permitidas || []);
  const [filialAtiva, setFilialAtiva] = useState<string | null>(() => initialSession?.filialAtiva || initialSession?.funcionario?.filial_padrao_id || null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const login = useCallback(async (username: string, senha: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const result: LoginResult = await funcionariosService.autenticar(username, senha);
      setFuncionario(result.funcionario);
      setPermissoes(result.permissoes);
      setFiliaisPermitidas(result.filiais_permitidas);
      setFilialAtiva(result.funcionario.filial_padrao_id || null);
      setIsAuthenticated(true);
      
      // Salva sessão no sessionStorage para persistir F5 na mesma aba
      sessionStorage.setItem('coliseu_session', JSON.stringify({
        funcionario: result.funcionario,
        permissoes: result.permissoes,
        filiais_permitidas: result.filiais_permitidas,
        filialAtiva: result.funcionario.filial_padrao_id || null,
        timestamp: Date.now()
      }));
      // Limpa qualquer resíduo antigo do localStorage
      localStorage.removeItem('coliseu_session');
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Erro ao autenticar';
      setLoginError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setFuncionario(null);
    setPermissoes([]);
    setFiliaisPermitidas([]);
    setFilialAtiva(null);
    sessionStorage.removeItem('coliseu_session');
    localStorage.removeItem('coliseu_session');
  }, []);

  const temPermissao = useCallback((permissaoKey: string): boolean => {
    if (!funcionario) return false;
    // Administrador tem acesso total
    if (funcionario.username?.toLowerCase() === 'admin' || funcionario.grupo_acesso_nome === 'Administrador') {
      return true;
    }
    return permissoes.some(p => p.permissao_key === permissaoKey && p.concedida === 1);
  }, [funcionario, permissoes]);

  const trocarFilial = useCallback((filialId: string) => {
    setFilialAtiva(filialId);
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      funcionario,
      permissoes,
      filiaisPermitidas,
      filialAtiva,
      login,
      logout,
      temPermissao,
      trocarFilial,
      loginError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
