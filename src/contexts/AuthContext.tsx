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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [permissoes, setPermissoes] = useState<GrupoAcessoPermissao[]>([]);
  const [filiaisPermitidas, setFiliaisPermitidas] = useState<FuncionarioFilial[]>([]);
  const [filialAtiva, setFilialAtiva] = useState<string | null>(null);
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
      // Save session to localStorage
      localStorage.setItem('coliseu_session', JSON.stringify({
        funcionarioId: result.funcionario.id,
        timestamp: Date.now()
      }));
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
