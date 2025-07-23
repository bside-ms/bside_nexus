FROM node:20.18-alpine as base


FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --force



FROM base AS runner
WORKDIR /app

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
ENV MATTERMOST_AUTH_TOKEN=$MATTERMOST_AUTH_TOKEN


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
