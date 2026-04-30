# Changelog

## 0.1.0 (2026-04-30)


### Features

* orb animation, playback-aware mode tracking, styling fixes, examples overhaul ([d521ead](https://github.com/deepgram/agent/commit/d521ead8373d18167bb3eb0c8e546ef1e2bddeac))
* **react:** redesign as composable component system ([61bcf2f](https://github.com/deepgram/agent/commit/61bcf2f21f62b940e6c430e91e8bdd9e95abe0bb))
* restructure as bun monorepo with three-package architecture ([5bf3ef7](https://github.com/deepgram/agent/commit/5bf3ef7ba956a5d44b58ed3f87a2d31cbc83878e))
* **sdk:** add custom WebSocket URL support and fix scroll-stealing ([df018cf](https://github.com/deepgram/agent/commit/df018cf8c00755c604f04a08dbc4d56ec58328d1))
* **widget:** adaptive light-dark CSS token architecture with colorScheme config ([7a58ab4](https://github.com/deepgram/agent/commit/7a58ab47fd56ed9fcd2634b364fc0cc97a80d882))
* **widget:** add button and embedded layouts ([c47a53c](https://github.com/deepgram/agent/commit/c47a53cd2e776bbed27dfe12194e044004564ffc))
* **widget:** add orb layout — animated hoop with start/stop button ([27908d4](https://github.com/deepgram/agent/commit/27908d49d1e2f12e38a647b8dd0f2d16f23c0375))
* **widget:** expand CSS token system for full customization ([f54f15c](https://github.com/deepgram/agent/commit/f54f15c7464e5b4cc5604e3e0d0b00dc06469cb2))
* **widget:** expand WidgetConfig with placement, callbacks, text overrides, and feature flags ([86bc26d](https://github.com/deepgram/agent/commit/86bc26dd18c36b5bd4901e6ef486131fc1f08f8a))


### Bug Fixes

* **deps:** update vite 8.0.3 → 8.0.5 — fixes 3 vulnerabilities (2 high, 1 moderate) ([2d29fad](https://github.com/deepgram/agent/commit/2d29fad1a47589b09040f71d03b883686d4f5a12))
* **widget:** conversation scrolls within container instead of expanding it ([96afe4b](https://github.com/deepgram/agent/commit/96afe4b36e561a31c4eb09fc2d953260c0cb5054))
* **widget:** force transparent background on orb layout root ([18fc508](https://github.com/deepgram/agent/commit/18fc508b9a54a023313054ce2e57ede3b1856167))
* **widget:** transparent background on orb layout ([c8232a5](https://github.com/deepgram/agent/commit/c8232a55a5964be24fdf0a64a8e16947e1b72c89))
* **widget:** unify panel open/close toggle — close button and overlay work again ([a734d39](https://github.com/deepgram/agent/commit/a734d398254c9ab2d99c5ac95f582605b46f227c))


### Refactors

* major restructure — extract react/ui to own repos, Tailwind migration, code review fixes ([0d1f28e](https://github.com/deepgram/agent/commit/0d1f28eaecbc7bbb12c7c93baba57bb07dae2680))
* rename packages to @deepgram/agent, @deepgram/agent-react, @deepgram/agent-widget ([361b092](https://github.com/deepgram/agent/commit/361b092ffde2cbfcfda5f3f6d868ecf6ec127235))
* split react into react (hooks) + react-ui (styled components) ([88ef8f2](https://github.com/deepgram/agent/commit/88ef8f2d5d43340d3e80146c083868c561a8dd7e))
