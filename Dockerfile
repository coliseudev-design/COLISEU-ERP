# ==========================================
# Estágio 1: Build da Aplicação Frontend (Vite + React + TS)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifestos de dependências para aproveitar cache do Docker
COPY package.json package-lock.json ./

# Instalar dependências de build
RUN npm ci --prefer-offline --no-audit

# Copiar o restante do código fonte
COPY . .

# Compilar para produção (Vite output em /app/dist)
RUN npm run build

# ==========================================
# Estágio 2: Servidor Web Nginx para Produção
# ==========================================
FROM nginx:1.27-alpine AS runner

# Remover configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copiar configuração customizada otimizada para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os arquivos estáticos compilados do estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor porta HTTP padrão
EXPOSE 80

# Healthcheck do container
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]