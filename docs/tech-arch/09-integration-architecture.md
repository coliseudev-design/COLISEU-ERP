# 09 — INTEGRATION ARCHITECTURE

## Arquitetura de Integrações Externas (§39, §40)

### 1. SEFAZ Web Services (mTLS SOAP 1.2)
- Assinatura XMLDSIG via certificado A1 no formato PKCS#12/PFX.
- Fila de contingência assíncrona com exponential backoff para retransmissão de documentos negados por instabilidade.

### 2. WhatsApp Gateway (Rust Native)
- Conexão assíncrona com instâncias Evolution API / Meta Cloud API.
- Chaves de API encriptadas com AES-GCM usando o Vault de Credenciais.

### 3. Parser OFX (Financeiro)
- Leitura e parsing de extratos bancários `.ofx` com conciliação automática auxiliada pela IA.
