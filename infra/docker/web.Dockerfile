FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json /app/
COPY apps/web /app/apps/web

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app/apps/web
RUN pnpm install

CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

