# Agent Workspace Notes

## Scope

This repo owns:
- `@deepgram/agent` in `packages/sdk/`
- `@deepgram/agent-widget` in `packages/widget/`
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

- `@deepgram/agent` is the root package in the dependency chain.
- `@deepgram/agent-widget` bundles `@deepgram/react` and `@deepgram/ui`.
- Widget styling comes from `@deepgram/ui`'s compiled Tailwind CSS.
- Cross-stack behavior changes should still be reflected in the reference docs in `../dx-stack/` until that repo is migrated too.

## File Layout

```text
packages/
  sdk/      # @deepgram/agent
  widget/   # @deepgram/agent-widget
examples/   # local demos and dev preview
```
