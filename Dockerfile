FROM node:24-alpine AS builder
WORKDIR /app/platform
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.25.0
COPY platform/package.json platform/pnpm-lock.yaml platform/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY platform ./
COPY lib /app/lib
COPY public /app/public
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/platform/.next/standalone ./
COPY --from=builder --chown=node:node /app/platform/.next/static ./platform/.next/static
COPY --from=builder --chown=node:node /app/lib/data ./lib/data
COPY --from=builder --chown=node:node /app/platform/public ./platform/public
USER node
EXPOSE 8080
CMD ["node", "platform/server.js"]
