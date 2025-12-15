# ---------- builder ----------
FROM node:24 AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# run build if package.json has a build script
RUN if grep -q "\"build\"" package.json; then npm run build; else echo "no build"; fi

# ---------- runtime ----------
FROM node:24-slim AS runtime

WORKDIR /usr/src/app

# copy production deps metadata and install production deps
COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --production

# copy app files produced by builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/knexfile.ts ./knexfile.ts
# avoid copying secrets like .env into image in prod; if needed uncomment:
# COPY --from=builder /usr/src/app/.env ./.env

# ensure files are owned by non-root user 'node' (exists in official node images)
RUN chown -R node:node /usr/src/app || true

# switch to the official non-root user
USER node

EXPOSE 17063

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- --timeout=2 http://localhost:17063/health || exit 1

CMD ["npm", "run", "start"]
