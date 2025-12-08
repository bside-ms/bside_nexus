# Basis wechseln: Debian statt Alpine
FROM node:20-bookworm-slim as base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --force

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# LibreOffice + Fonts (ohne Recommends, um das Image kleiner zu halten)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       libreoffice \
       default-jre-headless \
       fonts-dejavu fontconfig \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

ARG DATABASE_URL

ARG AUTH_URL
ARG AUTH_SECRET

ARG KEYCLOAK_URL
ARG KEYCLOAK_REALM
ARG KEYCLOAK_API_USER
ARG KEYCLOAK_API_PASS
ARG KEYCLOAK_CLIENT_ID
ARG KEYCLOAK_CLIENT_SECRET

ARG MATTERMOST_URL
ARG MATTERMOST_AUTH_TOKEN

ARG PDF_DOCX_ENABLED
ARG PDF_TIMEOUT_MS

# Setze sie als ENV damit sie beim Build verfügbar sind
ENV DATABASE_URL=$DATABASE_URL

ENV AUTH_URL=$AUTH_URL
ENV AUTH_SECRET=$AUTH_SECRET

ENV KEYCLOAK_URL=$KEYCLOAK_URL
ENV KEYCLOAK_REALM=$KEYCLOAK_REALM
ENV KEYCLOAK_API_USER=$KEYCLOAK_API_USER
ENV KEYCLOAK_API_PASS=$KEYCLOAK_API_PASS
ENV KEYCLOAK_CLIENT_ID=$KEYCLOAK_CLIENT_ID
ENV KEYCLOAK_CLIENT_SECRET=$KEYCLOAK_CLIENT_SECRET

ENV MATTERMOST_URL=$MATTERMOST_URL
ENV MATTERMOST_AUTH_TOKEN=$

ENV PDF_DOCX_ENABLED=$PDF_DOCX_ENABLED
ENV PDF_TIMEOUT_MS=$PDF_TIMEOUT_MS


COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && mkdir -p /app/.next/cache

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 3000
ENV PORT 3000

VOLUME ["/app/.next/cache"]
CMD ["npm", "run", "start"]
