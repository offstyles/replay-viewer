# @offstyles/replay-viewer

Vue component that renders a bhop replay inside a Source Engine map using a WebGL2 port of the noclip.website renderer. Shipped as source; the consuming app's Vite build compiles it.

## Usage

```ts
import { ReplayViewerOverlay } from '@offstyles/replay-viewer'
```

```vue
<ReplayViewerOverlay :show="show" :map-name="mapName" :replay-id="replayId" :time="time" @close="show = false" />
```

The consumer needs:

- `@vitejs/plugin-vue` and `vite-plugin-wasm` in its Vite config
- `optimizeDeps.exclude: ['@offstyles/replay-viewer']` so Vite compiles the `.vue` sources instead of prebundling them
- Tailwind scanning this package's sources (`@source "../../node_modules/@offstyles/replay-viewer/src";`) and a `main-*` color palette
- `/api/replay?id=` endpoint

Pass `:compare-replay-id` to show time and speed diffs against another replay of the same map in the HUD.

The `src/wasm` directory is the wasm-pack output of [bhop-replay-viewer](https://github.com/offstyles/bhop-replay-viewer).
