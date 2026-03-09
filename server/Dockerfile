# Palma Marketplace – Backend (Node Express)
# Uses server/ only; env via runtime (docker-compose or K8s).

FROM node:20-alpine
RUN apk add --no-cache wget
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY . .
# Optional: build payment module if present
RUN npm run build:payment 2>/dev/null || true

EXPOSE 5000
# Readiness: use /ready so orchestrators only route traffic when DB (and deps) are up. Liveness = /health.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:5000/ready || exit 1
USER node
CMD ["node", "server.js"]
