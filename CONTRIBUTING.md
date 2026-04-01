# Contributing

Thanks for your interest in contributing to the Deepgram Agent!

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

## Setup

```bash
git clone git@github.com:deepgram/agent.git
cd agent
pnpm install
```

## Development

```bash
pnpm dev
```

The dev server runs on `:5173`.

## Building

```bash
pnpm build
```

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Ensure the build is clean: `pnpm build`
4. Commit using [conventional commits](https://www.conventionalcommits.org/) format
5. Open a pull request

## Commit Messages

This project uses conventional commits:

```
feat(skills): add new skill for managing models
fix(agent): resolve auth token refresh edge case
docs: update embedding instructions
```

## Questions?

Open an issue or reach out in the [Deepgram Discord](https://discord.gg/deepgram).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
