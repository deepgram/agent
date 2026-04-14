# Contributing

Thanks for your interest in contributing to the Deepgram Agent!

## Prerequisites

- [Bun](https://bun.sh/) 1.3+
- [Node.js](https://nodejs.org/) 20+ (for npm publish tooling)

## Setup

This is a Bun workspaces monorepo. The widget package depends on sibling repos via `file:` pointers, so you need all three repos cloned as siblings:

```bash
# Clone all repos as siblings
cd ~/Projects/deepgram  # or your preferred directory
git clone git@github.com:deepgram/agent.git
git clone git@github.com:deepgram/react.git
git clone git@github.com:deepgram/ui.git

# Build sibling dependencies
cd react && bun install && bun run build && cd ..
cd ui && bun install && bun run build && cd ..

# Install and build the agent repo
cd agent
bun install
```

If you only plan to work on `@deepgram/agent` (the SDK), the sibling repos are not required.

## Development

```bash
bun run dev
```

The examples dev server runs on `:5173`.

## Building

```bash
bun run build
```

## Testing

```bash
bun run test
```

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Ensure the build is clean: `bun run build`
4. Run tests: `bun run test`
5. Commit using [conventional commits](https://www.conventionalcommits.org/) format
6. Open a pull request

## Commit Messages

This project uses conventional commits:

```
feat(sdk): add new audio encoding option
fix(widget): resolve theme injection in shadow DOM
docs: update embedding instructions
```

## Questions?

Open an issue or reach out in the [Deepgram Discord](https://discord.gg/deepgram).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
