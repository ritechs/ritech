# RiTECHS API (NestJS). Build from the repository root:
#   docker build -f apps/api/Dockerfile -t ritechs-api .
FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @ritechs/api --workspace @ritechs/db --workspace @ritechs/shared --include-workspace-root
COPY packages packages
COPY apps/api apps/api
# Site content used by the optional seed step (plain TypeScript data files).
COPY apps/web/lib/content apps/web/lib/content
COPY apps/web/lib/data apps/web/lib/data
RUN npm run build -w @ritechs/shared && npm run build -w @ritechs/db && npm run build -w @ritechs/api \
 && npm prune --omit=dev --workspace @ritechs/api --workspace @ritechs/db --workspace @ritechs/shared

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
# Run as an unprivileged user; the image holds no secrets (they come from the environment).
RUN groupadd --system ritechs && useradd --system --gid ritechs --home /app ritechs \
 && mkdir -p /app/uploads && chown ritechs:ritechs /app/uploads
COPY --from=build --chown=ritechs:ritechs /repo/node_modules node_modules
COPY --from=build --chown=ritechs:ritechs /repo/packages/shared/package.json packages/shared/
COPY --from=build --chown=ritechs:ritechs /repo/packages/shared/dist packages/shared/dist
COPY --from=build --chown=ritechs:ritechs /repo/packages/db/package.json packages/db/
COPY --from=build --chown=ritechs:ritechs /repo/packages/db/dist packages/db/dist
COPY --from=build --chown=ritechs:ritechs /repo/packages/db/migrations packages/db/migrations
COPY --from=build --chown=ritechs:ritechs /repo/apps/web/lib apps/web/lib
COPY --from=build --chown=ritechs:ritechs /repo/apps/api/package.json apps/api/
COPY --from=build --chown=ritechs:ritechs /repo/apps/api/dist apps/api/dist
USER ritechs
WORKDIR /app/apps/api
ENV UPLOAD_DIR=/app/uploads PORT=4000
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
