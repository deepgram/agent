# Changelog

## [0.1.1](https://github.com/deepgram/agent/compare/agents-v0.1.0...agents-v0.1.1) (2026-04-30)


### Bug Fixes

* **sdk:** add repository metadata for npm provenance ([#34](https://github.com/deepgram/agent/issues/34)) ([dc836fc](https://github.com/deepgram/agent/commit/dc836fce5e862bd8e04ba204e4433b44e7d29984))

## 0.1.0 (2026-04-30)


### Features

* orb animation, playback-aware mode tracking, styling fixes, examples overhaul ([d521ead](https://github.com/deepgram/agent/commit/d521ead8373d18167bb3eb0c8e546ef1e2bddeac))
* restructure as bun monorepo with three-package architecture ([5bf3ef7](https://github.com/deepgram/agent/commit/5bf3ef7ba956a5d44b58ed3f87a2d31cbc83878e))
* **sdk:** add custom WebSocket URL support and fix scroll-stealing ([df018cf](https://github.com/deepgram/agent/commit/df018cf8c00755c604f04a08dbc4d56ec58328d1))
* **sdk:** add volume control, frequency data, and session ID APIs ([25ede8f](https://github.com/deepgram/agent/commit/25ede8fe53169980f3ea8edf4f0382d68a6d4f2b))


### Bug Fixes

* **deps:** update vite 8.0.3 → 8.0.5 — fixes 3 vulnerabilities (2 high, 1 moderate) ([2d29fad](https://github.com/deepgram/agent/commit/2d29fad1a47589b09040f71d03b883686d4f5a12))
* **sdk,examples:** clean up debug logging and fix integration test ([1d6102a](https://github.com/deepgram/agent/commit/1d6102a821c2c554c2d868fcb599b29b8d378fe0))
* **sdk:** add connection timeout and close-event race to waitForOpen wrapper ([77c6480](https://github.com/deepgram/agent/commit/77c6480a191edd647379382677f878634e263a88))
* **sdk:** call socket.connect() explicitly — WrappedAgentV1Socket is startClosed:true ([abac3dc](https://github.com/deepgram/agent/commit/abac3dc14dbfcc08af6eaf70fd46c9dcd5ae5639))
* **sdk:** change reconnectAttempts 0→1 — maxRetries:0 prevents initial connection ([5617c3e](https://github.com/deepgram/agent/commit/5617c3e39cb70101fd86228b4cd879fea9ef22e8))
* **sdk:** correct think/speak settings structure to use nested provider ([5d1c52e](https://github.com/deepgram/agent/commit/5d1c52ed3185955b35c68bb97351756e11c32557))
* **sdk:** handle Blob audio from WebSocket and resume suspended AudioContext ([cfcb510](https://github.com/deepgram/agent/commit/cfcb5108729174b1cef69fda320667bb0be970bc))
* **sdk:** pass apiKey to DeepgramClient constructor for browser compat; race waitForOpen() against close event ([c3528c0](https://github.com/deepgram/agent/commit/c3528c055f853b750507695953ceea67d019d0bb))
* **sdk:** set binaryType=arraybuffer before connect() ([6b4cdc4](https://github.com/deepgram/agent/commit/6b4cdc4f67ffe720b985bdf5bd75d80669650e59))
* **sdk:** use Bearer scheme for tokenFactory, Token scheme for apiKey ([427599f](https://github.com/deepgram/agent/commit/427599fcea5e70fe97b7fa5b20a4800db0d0ada2))
* **sdk:** wait for WebSocket open and buffer audio until SettingsApplied ([a670b30](https://github.com/deepgram/agent/commit/a670b309260aface3d8e547a1dd5957e64854a72))


### Refactors

* major restructure — extract react/ui to own repos, Tailwind migration, code review fixes ([0d1f28e](https://github.com/deepgram/agent/commit/0d1f28eaecbc7bbb12c7c93baba57bb07dae2680))
* rename packages to @deepgram/agent, @deepgram/agent-react, @deepgram/agent-widget ([361b092](https://github.com/deepgram/agent/commit/361b092ffde2cbfcfda5f3f6d868ecf6ec127235))
* **sdk:** derive settings types from @deepgram/sdk instead of reimplementing ([f81e64b](https://github.com/deepgram/agent/commit/f81e64b5f648eaee382f798b35fd18e537ba3913))
* **sdk:** remove Blob conversion — binaryType:arraybuffer guarantees ArrayBuffer ([5a20a8a](https://github.com/deepgram/agent/commit/5a20a8a1f80d4b141967555bd884ff4c099e5589))
* **sdk:** replace hand-written server message types with SDK agent namespace aliases ([6e185eb](https://github.com/deepgram/agent/commit/6e185eb607b3a2ddac9ae7b2ec44c4dec66e1139))
