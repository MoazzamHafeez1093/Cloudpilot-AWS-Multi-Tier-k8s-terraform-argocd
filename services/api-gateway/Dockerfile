FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS runner
LABEL org.opencontainers.image.title="cloudpilot-api-gateway"
LABEL org.opencontainers.image.description="API Gateway — rate limiting, security headers, proxy"
LABEL org.opencontainers.image.source="https://github.com/MoazzamHafeez1093/Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd"

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

USER appuser
EXPOSE 3000
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]