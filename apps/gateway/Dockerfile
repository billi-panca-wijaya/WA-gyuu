FROM node:22-bookworm-slim

WORKDIR /app

# Install runtime tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --omit=dev --no-audit --no-fund

COPY dist ./dist
COPY public ./public

ENV NODE_ENV=production
ENV PORT=18091
ENV DATABASE_PATH=/app/data/wagyuu.sqlite
ENV WAGYUU_SESSIONS_PATH=/app/data/sessions
ENV WAGYUU_HMAC_SECRET=wgy_live_interwin_secret_token_change_in_prod

VOLUME ["/app/data"]

EXPOSE 18091

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:18091/v1/health/liveness || exit 1

CMD ["node", "dist/main.js"]
