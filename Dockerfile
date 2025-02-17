FROM node:20.18.1-slim as base

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --force


## Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=base /app/node_modules ./node_modules
COPY . .
RUN npm run build && mkdir -p /app/.next/cache

EXPOSE 3001
ENV PORT 3001

VOLUME ["/app/.next/cache"]
CMD ["npm", "run", "start"]