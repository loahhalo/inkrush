FROM node:24-alpine
WORKDIR /app
COPY public ./public
COPY lib ./lib
COPY scripts/configure-hosted.mjs scripts/serve-hosted.mjs ./scripts/
RUN INKRUSH_HOSTED=1 node scripts/configure-hosted.mjs
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node", "scripts/serve-hosted.mjs"]
