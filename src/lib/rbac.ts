import { safeInvoke as invoke } from "./ipc";

export interface Usuario {
  id: string;
  empresa_id: string;
  nome: string;
  username: string;
  perfil: 'OPERADOR' | 'GERENTE' | 'ADMIN';
  ativo: number;
}

export interface ValidacaoAlcadaResult {
  aprovado: boolean;
  perfil_usuario: string;
  limite_permitido_percentual: number;
  mensagem: string;
}

export interface AuditLogEntry {
  id: string;
  created_at: string;
  usuario_id?: string;
  usuario_nome?: string;
  acao: string;
  recurso: string;
  detalhes?: string;
}

/**
 * Service Layer / Wrapper para Segurança RBAC, Alçadas & Audit Logs.
 */
export const rbacService = {
  async autenticarUsuario(username: string, passwordHash: string): Promise<Usuario> {
    return await invoke<Usuario>("autenticar_usuario", { username, passwordHash });
  },

  async validarAlcadaDesconto(usuarioId: string, percentualSolicitado: number): Promise<ValidacaoAlcadaResult> {
    return await invoke<ValidacaoAlcadaResult>("validar_alcada_desconto", { usuarioId, percentualSolicitado });
  },

  async salvarUsuario(
    empresaId: string,
    nome: string,
    username: string,
    passwordHash: string,
    perfil: string
  ): Promise<Usuario> {
    return await invoke<Usuario>("salvar_usuario", {
      empresaId,
      nome,
      username,
      passwordHash,
      perfil,
    });
  },

  async listarUsuarios(empresaId: string): Promise<Usuario[]> {
    return await invoke<Usuario[]>("listar_usuarios", { empresaId });
  },

  async listarAuditLogs(limit?: number): Promise<AuditLogEntry[]> {
    return await invoke<AuditLogEntry[]>("listar_audit_logs", { limit });
  },
};
