FROM oven/bun:1 AS base
WORKDIR /app

# Install deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY server.ts ./

# Fly.io sets PORT via env
EXPOSE 3001
CMD ["bun", "server.ts"]
