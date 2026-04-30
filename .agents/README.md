# Agent Workspace Notes

## Scope

This repo owns:
- `@deepgram/agents` in `packages/sdk/`
- `@deepgram/agents-widget` in `packages/widget/`
- local examples in `examples/`

Related sibling repos:
- `../react` → `@deepgram/react`
- `../ui` → `@deepgram/ui`

## Commands

```bash
bun run build
bun run typecheck
bun run test
bun run dev:examples
```

## Architecture Notes

- `@deepgram/agents` is the root package in the dependency chain.
- `@deepgram/agents-widget` bundles `@deepgram/react` and `@deepgram/ui`.
- Widget styling comes from `@deepgram/ui`'s compiled Tailwind CSS.
- Cross-stack behavior changes should still be reflected in the reference docs in `../dx-stack/` until that repo is migrated too.

## File Layout

```text
packages/
  sdk/      # @deepgram/agents
  widget/   # @deepgram/agents-widget
examples/   # local demos and dev preview
```
