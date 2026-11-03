# RiTECHS website (Next.js standalone). Build from the repository root:
#   docker build -f apps/web/Dockerfile -t ritechs-web .
FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @ritechs/web --workspace @ritechs/shared --include-workspace-root
COPY packages/shared packages/shared
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
# The API is not reachable while the image builds, so database-backed sections
# are pre-rendered empty; the API refreshes every page when it starts.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN npm run build -w @ritechs/shared && npm run build -w @ritechs/web

FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system ritechs && useradd --system --gid ritechs --home /app ritechs
COPY --from=build --chown=ritechs:ritechs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=ritechs:ritechs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=ritechs:ritechs /repo/apps/web/public ./apps/web/public
USER ritechs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
