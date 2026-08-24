# 🏢 Coliseu ERP - Sistema de Gestão Empresarial Híbrido (Local-First + Cloud)

Sistema ERP moderno de alta performance desenvolvido com arquitetura **Local-First**, suporte a **Desktop nativo (Tauri + Rust)** e **Web/Cloud (Docker + Nginx)**, emissão fiscal completa (**NF-e 4.00, NFC-e 4.00, MDF-e 3.00**) com integração oficial **TecnoSpeed spdNFeX**, controle de estoque, frente de caixa (PDV), faturamento, contas a pagar/receber e central do cliente 360°.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Lucide Icons
- **Desktop Runtime:** Tauri 2.0 (Rust) com chamadas nativas assíncronas
- **Motor Fiscal:** Componente Oficial TecnoSpeed (`spdNFeX` ActiveX/COM) + Nuvem Fiscal + ACBr
- **Banco de Dados Local:** SQLite embutido com suporte a migração Firebird
- **Containerização:** Docker & Docker Compose com Nginx multi-stage build

---

## 📦 Como Executar no Ambiente de Desenvolvimento

### Pré-requisitos:
- [Node.js 20+](https://nodejs.org/)
- [Rust & Cargo](https://rustup.rs/) (para compilação do aplicativo Desktop Tauri)

### Instalação e Inicialização:
```bash
# 1. Instalar dependências
npm install

# 2. Executar no navegador (Modo Web)
npm run dev

# 3. Executar como Aplicativo Desktop (Tauri)
npm run tauri dev
```

---

## 🛠️ Como Compilar o Executável Desktop (.exe / .msi)

Para gerar o executável final otimizado para Windows:

```bash
# Compilar versão de produção
npm run build
npm run tauri build
```

O binário final e os instaladores serão gerados em:
- `src-tauri/target/release/erp_local_first.exe`
- `src-tauri/target/release/bundle/nsis/` (Instalador Setup Windows)
- `src-tauri/target/release/bundle/msi/` (Instalador Corporativo MSI)

---

## 🐳 Como Publicar na VPS com Docker Compose

### 1. Clonar o Repositório na VPS:
```bash
git clone https://github.com/robersonsouzadev/ERP.git /opt/erp
cd /opt/erp
```

### 2. Configurar o Ambiente:
```bash
cp .env.example .env
# Edite a porta desejada se necessário (ex: PORT=80 ou PORT=8080)
```

### 3. Subir o Container:
```bash
docker compose up -d --build
```

### 4. Verificar Status dos Containers:
```bash
docker compose ps
docker compose logs -f erp-web
```

---

## 📄 Licença
Propriedade privada. Todos os direitos reservados.