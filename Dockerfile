# ==========================================
# Estágio 1: Build da Aplicação Frontend (Vite + React + TS)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=development

# Copiar manifestos de dependências para aproveitar cache do Docker
COPY package.json package-lock.json ./

# Instalar TODAS as dependências necessárias para o build
RUN npm ci --include=dev --prefer-offline --no-audit

# Copiar o restante do código fonte
COPY . .

# Compilar para produção (Vite output em /app/dist)
RUN npm run build

# ==========================================
# Estágio 2: Servidor Node.js Cloud API & SPA
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instalar curl e wget para healthcheck robusto
RUN apk add --no-cache curl wget

# Copiar manifestos de dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit

# Copiar script do servidor de API, sincronização, motor fiscal e rotas de BI/Backend
COPY server.js fiscalEngine.js ./
COPY src-server ./src-server

# Copiar os arquivos estáticos compilados do estágio anterior
COPY --from=builder /app/dist ./dist

# Expor portas HTTP
EXPOSE 80 3000

# Healthcheck do container (IPv4 direto 127.0.0.1)
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:80/api/health || curl -f http://127.0.0.1:3000/api/health || wget --quiet --tries=1 --spider http://127.0.0.1:80/api/health || exit 1

# Iniciar Servidor Node.js
CMD ["node", "server.js"]