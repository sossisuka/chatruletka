FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV BIND_HOST=0.0.0.0
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json /app/tsconfig.json /app/next.config.mjs ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/src/lib ./src/lib
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
