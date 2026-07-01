FROM node:20.14.0-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/ai-gateway/package.json apps/ai-gateway/package.json

RUN pnpm install --frozen-lockfile

COPY apps/ai-gateway apps/ai-gateway
COPY prompts prompts
COPY schemas schemas

RUN pnpm --filter ai-gateway build

EXPOSE 8787

CMD ["pnpm", "--filter", "ai-gateway", "start"]
