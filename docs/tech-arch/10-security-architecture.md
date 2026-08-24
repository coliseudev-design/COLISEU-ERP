# 10 — SECURITY ARCHITECTURE

## Arquitetura de Segurança, Isolamento & Criptografia (§23-27, §60, §97, §98)

1. **Vault de Credenciais**: `keyring` crate para armazenamento de segredos no Windows Credential Manager.
2. **Criptografia do Banco**: SQLCipher AES-256-GCM.
3. **Escopo RBAC + Contextual**: Negação por padrão (`Default Deny`). Acesso validado por `(Empresa, Filial, Usuário, Permissão)`.
4. **Auditoria Inviolável**: Registra quem, o quê, quando, onde, `correlationId` e valores anteriores/posteriores de alterações críticas.
