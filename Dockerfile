FROM oven/bun:1

WORKDIR /app
COPY . .

RUN bun install
RUN bun run --filter '@deepgram/*' build

WORKDIR /app/examples
EXPOSE 8080

# Copy UMD examples + shared styles into dist (they're static HTML, not bundled by Vite)
RUN mkdir -p dist/src && \
    cp src/shared-styles.css dist/src/shared-styles.css && \
    cp -r 20-umd-sidebar dist/20-umd-sidebar && \
    cp -r 21-umd-inline dist/21-umd-inline && \
    cp -r 22-umd-floating dist/22-umd-floating && \
    cp -r 23-umd-console dist/23-umd-console

CMD ["bun", "run", "serve.ts"]
