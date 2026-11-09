FROM node:24-bookworm-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --force

# Shared by builder and runner: system packages and env.
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security updates for the base, then LibreOffice + fonts. The DOCX to PDF conversion does not need JAVA.
RUN apt-get update \
  && apt-get upgrade -y \
  && apt-get install -y --no-install-recommends \
       libreoffice \
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

FROM runtime AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dev tools (eslint, typescript, drizzle-kit, tsx/esbuild) are only needed for the build.
# Pruning in a separate stage keeps them out of every layer of the final image.
RUN npm run build && npm prune --omit=dev --force && rm -rf /app/.next/cache

FROM runtime AS runner
COPY --from=builder /app /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /home/nextjs /app/.next/cache && chown nextjs:nodejs /home/nextjs /app/.next/cache
ENV HOME=/home/nextjs

USER nextjs

EXPOSE 3000
ENV PORT 3000

VOLUME ["/app/.next/cache"]
CMD ["npm", "run", "start"]
