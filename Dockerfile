FROM oven/bun:1

WORKDIR /app
COPY . .

RUN bun install
RUN bun run --filter '@deepgram/*' build

WORKDIR /app/examples
EXPOSE 8080

CMD ["bunx", "vite", "--host", "0.0.0.0", "--port", "8080"]
