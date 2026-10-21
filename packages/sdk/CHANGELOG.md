# Changelog

## [0.2.0](https://github.com/deepgram/agent/compare/agents-v0.1.2...agents-v0.2.0) (2026-10-21)


### ⚠ BREAKING CHANGES

* **deps-dev:** Disables CSS and IFrame loading by default (<a href="https://redirect.github.com/capricorn86/happy-dom/issues/2502">#2502</a>)</li> <li><a href="https://github.com/capricorn86/happy-dom/commit/f21dbd7d0a0c63cdd41954ba5d0f05def4e0f2b3"><code>f21dbd7</code></a> fix: Fixes cookie scope forgery vulnerability (<a href="https://redirect.github.com/capricorn86/happy-dom/issues/2477">#2477</a>)</li> <li><a href="https://github.com/capricorn86/happy-dom/commit/0d4cdbe7442af49d16b49ddf1acf7cc9684ed318"><code>0d4cdbe</code></a> fix: <a href="https://redirect.github.com/capricorn86/happy-dom/issues/2409">#2409</a> Preserve character references in comment data (<a href="https://redirect.github.com/capricorn86/happy-dom/issues/2410">#2410</a>)</li> <li><a href="https://github.com/capricorn86/happy-dom/commit/9c920a414a0e27a9c8f279a2be59beaaefd754e0"><code>9c920a4</code></a> fix: <a href="https://redirect.github.com/capricorn86/happy-dom/issues/2407">#2407</a> End comments at the first comment end tag when it overlaps a com...</li> <li><a href="https://github.com/capricorn86/happy-dom/commit/5fb1df3df8fcbd037341e848bfd33e5a35c6d910"><code>5fb1df3</code></a> fix: <a href="https://redirect.github.com/capricorn86/happy-dom/issues/2363">#2363</a> Avoids cloning all properties in CSSPropertyManager.toString() (...</li> <li><a href="https://github.com/capricorn86/happy-dom/commit/de0a1e9107f75dc089cf72853257c83818e1874b"><code>de0a1e9</code></a> fix: <a href="https://redirect.github.com/capricorn86/happy-dom/issues/2344">#2344</a> Resolve every var() in a value, not only the first one (<a href="https://redirect.github.com/capricorn86/happy-dom/issues/2395">#2395</a>)</li> <li><a href="https://github.com/capricorn86/happy-dom/commit/64b8b9479860ce0242f4ddedc3dfd5f9d53ab63c"><code>64b8b94</code></a> fix: <a href="https://redirect.github.com/capricorn86/happy-dom/issues/2366">#2366</a> Invalidate the computed style cache for the whole subtree (<a href="https://redirect.github.com/capricorn86/happy-dom/issues/2367">#2367</a>)</li> <li><a href="https://github.com/capricorn86/happy-dom/commit/eac5a38026b0569f2d52b609b2bb4cbaa94d9644"><code>eac5a38</code></a> feat: <a href="https://redirect.github.com/capricorn86/happy-dom/issues/2357">#2357</a> Improves computed style cache (<a href="https://redirect.github.com/capricorn86/happy-dom/issues/2358">#2358</a>)</li> <li><a href="https://github.com/capricorn86/happy-dom/commit/5b3559bc6d6df04c10bd4237575d5b2bd886e1a5"><code>5b3559b</code></a> fix: <a href="https://redirect.github.com/capricorn86/happy-dom/issues/2349">#2349</a> Fix problem with getComputedStyle with :host and :host-context s...</li> <li>Additional commits viewable in <a href="https://github.com/capricorn86/happy-dom/compare/v20.9.0...v21.0.1">compare view</a></li> </ul> </details> <br />

### Bug Fixes

* **sdk:** preserve API key auth for custom URLs ([957027c](https://github.com/deepgram/agent/commit/957027c887e653271e5cd1aed8ca83aa0ad8c130))
* **sdk:** preserve API key auth for custom URLs ([#81](https://github.com/deepgram/agent/issues/81)) ([48bb78c](https://github.com/deepgram/agent/commit/48bb78ce74ecd5ab7c254ace786c9c7ce03f1e19)), closes [#88](https://github.com/deepgram/agent/issues/88)


### Miscellaneous

* **deps-dev:** bump happy-dom from 20.9.0 to 21.0.1 ([#85](https://github.com/deepgram/agent/issues/85)) ([f1caee3](https://github.com/deepgram/agent/commit/f1caee3cbd2672ff6115915c6af1630444004eaf))

## [0.1.2](https://github.com/deepgram/agent/compare/agents-v0.1.1...agents-v0.1.2) (2026-09-03)


### Features

* **sdk:** upgrade the underlying Agent transport from `@deepgram/sdk` 5.1 to 5.9 and align settings, binary-message, and request-ID handling with the current Agent v1 socket ([#71](https://github.com/deepgram/agent/issues/71)) ([5a63c41](https://github.com/deepgram/agent/commit/5a63c41d9d91d5ff5f76448fbfc5e056f064a69a))
* **sdk:** expose `updateListen`, injection behavior, conversation-history clearing, and typed `ListenUpdated`, `LatencyReport`, `History`, and `FunctionCallResponse` events ([d08b6df](https://github.com/deepgram/agent/commit/d08b6df2dd39912faba4dbb1cf383a7d9f990608))


### Bug Fixes

* **sdk:** serialize Blob audio, JSON messages, and synchronous socket failures so accepted messages are emitted in wire order before reconnect teardown ([7f76952](https://github.com/deepgram/agent/commit/7f76952ac47a1157c27afe3d4bad5a494fbf3938))
* **sdk:** refresh credentials on each reconnect attempt, restore inline conversation and completed function-call context, and retain queued audio until the replacement connection receives `SettingsApplied` ([d08b6df](https://github.com/deepgram/agent/commit/d08b6df2dd39912faba4dbb1cf383a7d9f990608))
* **sdk:** compact reconnect replay to the latest prompt, listen, speak, and think updates in last-set order, and reset the consecutive-attempt counter only after `SettingsApplied` ([33d2480](https://github.com/deepgram/agent/commit/33d2480f0b5837dc7e129e0c3055b65ca8be29b1))

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
