FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=5000 DATA_DIR=/app/data
WORKDIR /app
RUN groupadd --system bloom && useradd --system --gid bloom --home /app bloom && mkdir -p /app/data && chown -R bloom:bloom /app
COPY --from=build --chown=bloom:bloom /app/package*.json ./
COPY --from=build --chown=bloom:bloom /app/node_modules ./node_modules
COPY --from=build --chown=bloom:bloom /app/dist ./dist
COPY --chown=bloom:bloom public ./public
USER bloom
EXPOSE 5000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
