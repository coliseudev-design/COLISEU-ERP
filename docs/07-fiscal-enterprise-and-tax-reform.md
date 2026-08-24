# Coliseu ERP — Documentação Fiscal Enterprise & Reforma Tributária (Fase 7)

**Data de Implementation:** 14/08/2026  
**Versão:** 1.0  
**Status:** Implementado  

---

## 1. Visão Geral do Módulo Fiscal

A Fase 7 garante conformidade fiscal do **Coliseu ERP** perante a Secretaria da Fazenda (SEFAZ) e Receita Federal, englobando documentos eletrônicos (NF-e, NFC-e, NFS-e Nacional), arquivo SPED EFD e regras da **Reforma Tributária (LC 214/2025)**.

---

## 2. Emissão Eletrônica & DANFE/DANFSe Pixel-Perfect (Handbook §31, §32)

- **DANFE NF-e (Modelo 55)** & **DANFCe (Modelo 65)**.
- **DANFSe Nacional (Modelo 88)**: 13 blocos recalculados milimetricamente em Rust (`danfse/blocks.rs`), eliminação de sobreposição de textos e QR Code oficial do Padrão Nacional.
- **Assinatura XMLDSIG A1**: Assinatura com biblioteca OpenSSL Rust e certificado digital PKCS#12 (`.pfx`) sem vazamento de chaves em disco (`fiscal/signer.rs`).

---

## 3. SPED Fiscal EFD ICMS-IPI (`SpedPage.tsx` / `fiscal/sped.rs` — Handbook §33)

Exportação dos Registros Obrigatórios:
- **Bloco 0**: Abertura, Cadastro e Identificação da Entidade (0000, 0005, 0150, 0200).
- **Bloco C**: Documentos Fiscais I - Mercadorias (C100, C170, C190).
- **Bloco E**: Apuração do ICMS e IPI (E100, E110).
- **Bloco 9**: Controle e Encerramento do Arquivo Digital (9001, 9999).

---

## 4. Reforma Tributária CBS / IBS (LC 214/2025 — Handbook §35)

- Campos nativos nos XMLs para destaque de **CBS (Federal)** e **IBS (Subnacional)**.
- Código de Classificação Tributária **cClassTrib** para rastreabilidade fiscal.
