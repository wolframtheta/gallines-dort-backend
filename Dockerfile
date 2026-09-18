# Build stage
FROM node:24-alpine AS builder

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production stage
FROM node:24-alpine

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod \
  && apk del python3 make g++

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
