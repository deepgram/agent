# Contributing

Thanks for your interest in contributing to the Deepgram Console Agent!

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Bun](https://bun.sh/) (for running the proxy server)

## Setup

```bash
git clone git@github.com:deepgram/deepgram-console-agent.git
cd deepgram-console-agent
pnpm install
```

## Development

```bash
# Start both packages in development mode
pnpm dev
```

The client dev server runs on `:5173` and the proxy server on `:3001`.

## Building

```bash
pnpm build
```

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Ensure the client builds cleanly: `pnpm build`
4. Test your changes against the console UI
5. Commit using [conventional commits](https://www.conventionalcommits.org/) format
6. Open a pull request

## Commit Messages

This project uses conventional commits:

```
feat(client): add new skill for managing models
fix(server): resolve CORS header issue
docs: update deployment instructions
```

## Questions?

Open an issue or reach out in the [Deepgram Discord](https://discord.gg/deepgram).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
