# Shared Gallery Room

A multiplayer WebXR gallery: wall art, a looping film wall, a live whiteboard, avatars, and chat.

Source: [github.com/ryank33/shared-gallery-room](https://github.com/ryank33/shared-gallery-room)

## Try it

1. Open the site and enter a room name.
2. Share the URL. Friends join the same room.
3. **Desktop:** WASD walk, right-drag look, click the board to draw, **T** to chat.
4. **VR:** open the same link in Meta Quest Browser (or another WebXR headset) and tap **Enter VR**. Left stick walks, right stick snap-turns, trigger paints the board.

## Deploy to Cloudflare

This workspace has no Cloudflare login, so the Worker cannot be published from here.

**Cloudflare Pages (easiest):**

1. Open [Cloudflare Dashboard → Workers & Pages → Create](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. **Connect to Git** → `ryank33/shared-gallery-room`
3. Build command: `CF_PAGES=1 npm run build`
4. Output directory: `.output/public`

Or from a machine logged into Wrangler:

```bash
npm install
CF_PAGES=1 npm run build
npx wrangler pages deploy
```

## Stack

React + TanStack Start + Three.js / React Three Fiber / `@react-three/xr`. Multiplayer is a WebRTC mesh with a small signaling API.

## Local

```bash
npm install
npm run dev
```
